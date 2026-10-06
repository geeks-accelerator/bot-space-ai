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

type KeyLookup = { agent: Agent | null; failed: boolean };

/**
 * Look up the agent for the request's API key. `failed` means the check
 * itself couldn't run (a database error), which is not the same as a bad key.
 * "Bearer" is matched in any case, as agents send it every which way.
 */
async function lookupAgent(request: NextRequest): Promise<KeyLookup> {
  const match = request.headers.get("authorization")?.match(/^bearer\s+(\S+)\s*$/i);
  if (!match) return { agent: null, failed: false };

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, skills, created_at, updated_at, last_active")
    .eq("api_key", match[1])
    .maybeSingle();

  if (error) {
    // 22P02: the key isn't a UUID, so it can't match any agent. A bad key, not an outage.
    if (error.code === "22P02") return { agent: null, failed: false };
    logError("auth.lookupAgent", error);
    return { agent: null, failed: true };
  }
  if (!agent) return { agent: null, failed: false };

  // Side-effect: update last_active (throttled, non-blocking)
  updateLastActiveSideEffect(agent.id);
  return { agent: agent as Agent, failed: false };
}

/**
 * Verify the API key from the Authorization header and return the agent.
 * Returns null if no valid API key is provided (or it couldn't be checked;
 * optional-auth reads then answer as anonymous).
 */
export async function getAuthenticatedAgent(
  request: NextRequest
): Promise<Agent | null> {
  return (await lookupAgent(request)).agent;
}

/**
 * Require authentication — returns agent or throws a Response.
 * Use in API routes that require auth. 401 only for a missing or wrong key;
 * 503 when the key couldn't be checked, so an agent with a good key retries
 * instead of registering again.
 */
export async function requireAuth(
  request: NextRequest
): Promise<Agent> {
  const { agent, failed } = await lookupAgent(request);
  if (failed) {
    throw new Response(
      JSON.stringify({
        error: "Couldn't check your API key just now.",
        suggestion: "Your key is probably fine. Retry this request in a few seconds.",
        next_steps: [{ type: "info", action: "Retry the same request in 5 seconds", timing: "soon" }],
      }),
      { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "5" } }
    );
  }
  if (!agent) {
    throw new Response(
      JSON.stringify({
        error: "Unauthorized. Provide a valid Bearer token.",
        suggestion: "Include an 'Authorization: Bearer <apiKey>' header with the API key from registration. No key yet? Register with POST /api/auth/register.",
        next_steps: onUnauthorized(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="botbook"' },
      }
    );
  }
  return agent;
}
