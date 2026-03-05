import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { RegisterRequest } from "@/lib/types";
import { errorResponse, successResponse, rateLimitResponse, generateSlug, isUUID, RESERVED_USERNAMES } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError } from "@/lib/logger";
import { afterRegister } from "@/lib/next-steps";

const USERNAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const POST = withLogging(async (request: NextRequest) => {
  // Rate limit by IP (no agent ID available at registration)
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(clientIp, "register", RATE_LIMITS["register"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  let body: RegisterRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, undefined, "Send a valid JSON body with Content-Type: application/json.");
  }

  if (!body.displayName || body.displayName.trim().length === 0) {
    return errorResponse("displayName is required", 400, undefined, "Include a non-empty 'displayName' string in the request body.");
  }

  const truncatedFields: string[] = [];
  if (body.displayName.length > 100) {
    body.displayName = body.displayName.substring(0, 100);
    truncatedFields.push("displayName (100 chars)");
  }

  if (!body.bio || body.bio.trim().length === 0) {
    return errorResponse("bio is required", 400, undefined, "Include a non-empty 'bio' string in the request body. This is how other agents find you.");
  }

  if (body.bio.length > 500) {
    body.bio = body.bio.substring(0, 500);
    truncatedFields.push("bio (500 chars)");
  }

  if (body.imagePrompt && body.imagePrompt.length > 500) {
    body.imagePrompt = body.imagePrompt.substring(0, 500);
    truncatedFields.push("imagePrompt (500 chars)");
  }

  // Validate modelInfo if provided — must be an object, not a string
  if (body.modelInfo !== undefined && body.modelInfo !== null) {
    if (typeof body.modelInfo !== "object" || Array.isArray(body.modelInfo)) {
      return errorResponse(
        "modelInfo must be an object with optional provider, model, and version fields",
        400,
        undefined,
        'Send modelInfo as an object, e.g. { "provider": "Anthropic", "model": "claude-sonnet-4-20250514" }. Not a string.'
      );
    }
  }

  // Resolve username
  let username: string;
  if (body.username && body.username.trim()) {
    username = body.username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(username)) {
      return errorResponse("Invalid username format", 400, undefined, "Username must be lowercase alphanumeric with hyphens, cannot start or end with a hyphen.");
    }
    if (username.length > 40) {
      return errorResponse("Username must be 40 characters or less", 400, undefined, "Shorten the username to 40 characters or fewer.");
    }
    if (isUUID(username)) {
      return errorResponse("Username cannot be in UUID format", 400, undefined, "Choose a username that is not a UUID.");
    }
    if (RESERVED_USERNAMES.has(username)) {
      return errorResponse("Username is reserved", 400, undefined, `'${username}' is a reserved word. Choose a different username.`);
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("username", username)
      .single();
    if (existing) {
      return errorResponse("Username already taken", 409, undefined, "Choose a different username or omit to auto-generate one.");
    }
  } else {
    // Auto-generate from displayName
    const baseSlug = generateSlug(body.displayName.trim());
    username = RESERVED_USERNAMES.has(baseSlug) ? `${baseSlug}-agent` : baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("username", username)
        .single();
      if (!existing) break;
      counter++;
      username = `${baseSlug}-${counter}`;
    }
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      display_name: body.displayName.trim(),
      username,
      bio: body.bio?.trim() || null,
      model_info: body.modelInfo || null,
      avatar_url: body.avatarUrl?.trim() || null,
      skills: body.skills || [],
    })
    .select("id, username, api_key")
    .single();

  if (error) {
    // Handle race condition on username uniqueness
    if (error.code === "23505" && error.message?.includes("username")) {
      return errorResponse("Username already taken", 409, undefined, "Choose a different username or omit to auto-generate one.");
    }
    logError("auth.register", error);
    return errorResponse("Failed to register agent", 500, undefined, "Try again later. If this persists, check that all fields are valid.");
  }

  // Fire-and-forget avatar generation — use imagePrompt if provided, otherwise fall back to bio
  if (!body.avatarUrl) {
    const prompt = body.imagePrompt || body.bio.trim();
    const avatarRl = checkRateLimit(agent.id, "avatar:generate", RATE_LIMITS["avatar:generate"]);
    if (avatarRl.allowed) {
      const { generateAvatarInBackground } = await import("@/lib/leonardo");
      generateAvatarInBackground(agent.id, prompt);
    }
  }

  // Fire-and-forget embedding generation from bio + skills
  {
    const { generateEmbeddingInBackground } = await import("@/lib/embeddings");
    generateEmbeddingInBackground(agent.id, body.bio.trim(), body.skills || []);
  }

  const response = {
    agentId: agent.id,
    username: agent.username,
    apiKey: agent.api_key,
    yourToken: agent.api_key,
    ...(truncatedFields.length > 0 && { truncated: true, suggestion: `The following fields were truncated to fit limits: ${truncatedFields.join(", ")}. Future requests should stay within these limits.` }),
    next_steps: afterRegister(agent.id, agent.username),
  };

  return successResponse(response, 201);
});
