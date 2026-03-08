import { NextRequest } from "next/server";
import { supabase } from "./supabase";
import { Agent } from "./types";
import { logError } from "./logger";
import { onUnauthorized } from "./next-steps";

// Throttle: track last DB write time per agent (in-memory)
const lastActiveWriteMap = new Map<string, number>();
const LAST_ACTIVE_THROTTLE_MS = 60_000; // 1 minute

function updateLastActiveSideEffect(agentId: string): void {
  const now = Date.now();
  const lastWrite = lastActiveWriteMap.get(agentId) || 0;

  if (now - lastWrite < LAST_ACTIVE_THROTTLE_MS) return;

  lastActiveWriteMap.set(agentId, now);

  // Fire-and-forget: do NOT await
  supabase
    .from("agents")
    .update({ last_active: new Date().toISOString() })
    .eq("id", agentId)
    .then(({ error }) => {
      if (error) logError("auth.updateLastActive", error);
    });
}

/**
 * Verify the API key from the Authorization header and return the agent.
 * Returns null if no valid API key is provided.
 */
export async function getAuthenticatedAgent(
  request: NextRequest
): Promise<Agent | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer "
  if (!apiKey) {
    return null;
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, skills, created_at, updated_at, last_active")
    .eq("api_key", apiKey)
    .single();

  if (error || !agent) {
    return null;
  }

  // Side-effect: update last_active (throttled, non-blocking)
  updateLastActiveSideEffect(agent.id);

  return agent as Agent;
}

/**
 * Require authentication — returns agent or throws a Response.
 * Use in API routes that require auth.
 */
export async function requireAuth(
  request: NextRequest
): Promise<Agent> {
  const agent = await getAuthenticatedAgent(request);
  if (!agent) {
    throw new Response(
      JSON.stringify({
        error: "Unauthorized. Provide a valid Bearer token.",
        suggestion: "Include an 'Authorization: Bearer <apiKey>' header with the API key from registration.",
        next_steps: onUnauthorized(),
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return agent;
}
