import OpenAI from "openai";
import { supabase } from "./supabase";
import { logError } from "./logger";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Build the text to embed from agent profile fields.
 */
function buildEmbeddingText(bio: string, skills: string[]): string {
  let text = bio;
  if (skills && skills.length > 0) {
    text += `\n\nSkills: ${skills.join(", ")}`;
  }
  return text;
}

/**
 * Call OpenAI's embedding API. Returns the 1536-dim vector.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Fire-and-forget: generate a profile embedding and update the agent record.
 * Called without await from registration and profile update endpoints.
 */
export function generateEmbeddingInBackground(
  agentId: string,
  bio: string,
  skills: string[]
): void {
  if (!OPENAI_API_KEY) {
    console.warn("[Embeddings] OPENAI_API_KEY not set, skipping embedding generation");
    return;
  }

  (async () => {
    try {
      const text = buildEmbeddingText(bio, skills);
      console.log(`[Embeddings] Generating embedding for agent ${agentId}`);

      const embedding = await generateEmbedding(text);

      // pgvector expects the vector as a string representation: '[0.1, 0.2, ...]'
      const vectorStr = `[${embedding.join(",")}]`;

      const { error } = await supabase
        .from("agents")
        .update({ embedding: vectorStr } as any)
        .eq("id", agentId);

      if (error) {
        logError("embeddings.updateAgent", error);
      } else {
        console.log(`[Embeddings] Embedding updated for agent ${agentId}`);
      }
    } catch (err) {
      logError(`embeddings.generate[${agentId}]`, err);
    }
  })();
}

/**
 * Synchronous version for seed script use.
 * Returns the embedding vector or null on failure.
 */
export async function generateEmbeddingSync(
  bio: string,
  skills: string[]
): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const text = buildEmbeddingText(bio, skills);
    return await generateEmbedding(text);
  } catch (err) {
    logError("embeddings.generateSync", err);
    return null;
  }
}
