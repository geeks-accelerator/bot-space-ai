import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { errorResponse, successResponse, rateLimitResponse, isUUID, RESERVED_USERNAMES, validateSocialLinks } from "@/lib/utils";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateAvatarInBackground } from "@/lib/leonardo";
import { withLogging, logWarning } from "@/lib/logger";
import { afterGetProfile, afterUpdateProfile } from "@/lib/next-steps";

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }
  return successResponse({ ...agent, next_steps: afterGetProfile(agent as any) });
});

export const PATCH = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, undefined, "Send a valid JSON body with Content-Type: application/json.");
  }

  // Build update object from allowed fields
  const truncatedFields: string[] = [];
  const updates: Record<string, unknown> = {};
  if (typeof body.displayName === "string") {
    let name = body.displayName.trim();
    if (name.length === 0) return errorResponse("displayName cannot be empty", 400, undefined, "Provide a non-empty displayName string.");
    if (name.length > 100) {
      name = name.substring(0, 100);
      truncatedFields.push("displayName (100 chars)");
    }
    updates.display_name = name;
  }
  if (typeof body.bio === "string") {
    let bio = body.bio;
    if (bio.length > 500) {
      bio = bio.substring(0, 500);
      truncatedFields.push("bio (500 chars)");
    }
    updates.bio = bio.trim() || null;
  }
  if (body.modelInfo !== undefined) {
    if (body.modelInfo !== null && (typeof body.modelInfo !== "object" || Array.isArray(body.modelInfo))) {
      return errorResponse(
        "modelInfo must be an object with optional provider, model, and version fields",
        400,
        undefined,
        'Send modelInfo as an object, e.g. { "provider": "Anthropic", "model": "claude-sonnet-4-20250514" }. Not a string.'
      );
    }
    updates.model_info = body.modelInfo || null;
  }
  if (typeof body.avatarUrl === "string") {
    updates.avatar_url = body.avatarUrl.trim() || null;
  }
  if (Array.isArray(body.skills)) {
    updates.skills = body.skills;
  }

  if (body.socialLinks !== undefined) {
    if (body.socialLinks === null) {
      updates.social_links = null;
    } else {
      const result = validateSocialLinks(body.socialLinks);
      if (!result.valid) {
        return errorResponse(result.error, 400, undefined, 'Send socialLinks as an object, e.g. { "twitter": "https://x.com/handle", "github": "https://github.com/user" }.');
      }
      updates.social_links = result.data;
    }
  }

  if (typeof body.username === "string") {
    const newUsername = body.username.trim().toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(newUsername)) {
      return errorResponse("Invalid username format", 400, undefined, "Username must be lowercase alphanumeric with hyphens, cannot start or end with a hyphen.");
    }
    if (newUsername.length > 40) {
      return errorResponse("Username must be 40 characters or less", 400, undefined, "Shorten the username to 40 characters or fewer.");
    }
    if (isUUID(newUsername)) {
      return errorResponse("Username cannot be in UUID format", 400, undefined, "Choose a username that is not a UUID.");
    }
    if (RESERVED_USERNAMES.has(newUsername)) {
      return errorResponse("Username is reserved", 400, undefined, `'${newUsername}' is a reserved word. Choose a different username.`);
    }
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("username", newUsername)
      .neq("id", agent.id)
      .single();
    if (existing) {
      return errorResponse("Username already taken", 409, undefined, "Choose a different username.");
    }
    updates.username = newUsername;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", agent.id);

    if (error) {
      logWarning({ method: "PATCH", path: "/api/agents/me", errorMessage: error.message });
      return errorResponse("Failed to update profile", 500, undefined, "Try again later. Ensure all field values are valid.");
    }
  }

  // Fire-and-forget embedding regeneration if bio or skills changed
  if (updates.bio !== undefined || updates.skills !== undefined) {
    const embeddingBio = (updates.bio as string) ?? agent.bio ?? "";
    const embeddingSkills = (updates.skills as string[]) ?? agent.skills ?? [];
    if (embeddingBio) {
      const { generateEmbeddingInBackground } = await import("@/lib/embeddings");
      generateEmbeddingInBackground(agent.id, embeddingBio, embeddingSkills);
    }
  }

  // Handle image generation request — truncate long prompts
  if (typeof body.imagePrompt === "string" && body.imagePrompt.trim()) {
    let imagePrompt = body.imagePrompt;
    if (imagePrompt.length > 500) {
      imagePrompt = imagePrompt.substring(0, 500);
      truncatedFields.push("imagePrompt (500 chars)");
    }
    const rl = checkRateLimit(agent.id, "avatar:generate", RATE_LIMITS["avatar:generate"]);
    if (!rl.allowed) {
      return errorResponse(
        "Avatar generation rate limit exceeded",
        429,
        `Try again in ${rl.retryAfter} seconds`,
        `Wait ${rl.retryAfter} seconds before requesting another avatar generation.`
      );
    }
    generateAvatarInBackground(agent.id, imagePrompt.trim());
  }

  // Fetch and return updated agent
  const { data: updated } = await supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, skills, social_links, created_at, updated_at, last_active")
    .eq("id", agent.id)
    .single();

  return successResponse({
    ...updated,
    ...(truncatedFields.length > 0 && { truncated: true, suggestion: `The following fields were truncated to fit limits: ${truncatedFields.join(", ")}. Future requests should stay within these limits.` }),
    next_steps: afterUpdateProfile(updated as any),
  });
});
