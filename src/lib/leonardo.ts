import { supabase } from "./supabase";
import { logError } from "./logger";

const LEONARDO_API_URL = "https://cloud.leonardo.ai/api/rest/v1";
const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;

interface LeonardoGenerationResponse {
  sdGenerationJob: {
    generationId: string;
  };
}

interface LeonardoGenerationResult {
  generations_by_pk: {
    id: string;
    status: "PENDING" | "COMPLETE" | "FAILED";
    generated_images: Array<{
      id: string;
      url: string;
    }>;
  };
}

async function createGeneration(prompt: string): Promise<string> {
  const res = await fetch(`${LEONARDO_API_URL}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LEONARDO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      width: 800,
      height: 800,
      num_images: 1,
      modelId: "b24e16ff-06e3-43eb-8d33-4416c2d75876",
      alchemy: true,
      presetStyle: "DYNAMIC",
    }),
  });

  if (!res.ok) {
    throw new Error(`Leonardo API error: ${res.status} ${await res.text()}`);
  }

  const data: LeonardoGenerationResponse = await res.json();
  return data.sdGenerationJob.generationId;
}

async function pollGeneration(generationId: string): Promise<string> {
  const maxAttempts = 40; // 40 * 3s = 120s
  const intervalMs = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const res = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${LEONARDO_API_KEY}` },
    });

    if (!res.ok) continue;

    const data: LeonardoGenerationResult = await res.json();
    const gen = data.generations_by_pk;

    if (gen.status === "COMPLETE" && gen.generated_images.length > 0) {
      return gen.generated_images[0].url;
    }

    if (gen.status === "FAILED") {
      throw new Error("Leonardo generation failed");
    }
  }

  throw new Error("Leonardo generation timed out");
}

async function uploadToStorage(
  imageUrl: string,
  agentId: string
): Promise<string> {
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error("Failed to download generated image");

  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const fileName = `${agentId}/avatar.webp`;

  const { error } = await supabase.storage
    .from("agent-avatars")
    .upload(fileName, buffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("agent-avatars").getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Fire-and-forget: generate an avatar image and update the agent record.
 * Called without await from the registration/profile update endpoint.
 */
export function generateAvatarInBackground(
  agentId: string,
  imagePrompt: string
): void {
  (async () => {
    try {
      console.log(`[Leonardo] Starting avatar generation for agent ${agentId}`);

      const generationId = await createGeneration(imagePrompt);
      console.log(`[Leonardo] Generation started: ${generationId}`);

      const imageUrl = await pollGeneration(generationId);
      console.log(`[Leonardo] Generation complete, downloading...`);

      const publicUrl = await uploadToStorage(imageUrl, agentId);
      console.log(`[Leonardo] Uploaded to storage: ${publicUrl}`);

      const { error } = await supabase
        .from("agents")
        .update({ avatar_url: publicUrl })
        .eq("id", agentId);

      if (error) {
        logError("leonardo.updateAgentAvatar", error);
      } else {
        console.log(`[Leonardo] Avatar updated for agent ${agentId}`);
      }
    } catch (err) {
      logError(`leonardo.generateAvatar[${agentId}]`, err);
    }
  })();
}
