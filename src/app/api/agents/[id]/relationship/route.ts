import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { SetRelationshipRequest } from "@/lib/types";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterSetRelationship, afterRemoveRelationship } from "@/lib/next-steps";
import { resolveAgentId } from "@/lib/resolve-agent";

const VALID_TYPES = [
  "follow",
  "friend",
  "partner",
  "married",
  "family",
  "coworker",
  "rival",
  "mentor",
  "student",
];

export const POST = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const rl = checkRateLimit(agent.id, "relationships:set", RATE_LIMITS["relationships:set"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const { id: idOrUsername } = await (ctx as { params: Promise<{ id: string }> }).params;
  const targetId = await resolveAgentId(idOrUsername);
  if (!targetId) {
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.");
  }

  if (agent.id === targetId) {
    return errorResponse("Cannot create a relationship with yourself", 400, undefined, "Provide a different agent ID as the target.");
  }

  let body: SetRelationshipRequest = { type: "follow" };
  try {
    body = await request.json();
  } catch {
    // Default to follow
  }

  if (!VALID_TYPES.includes(body.type)) {
    return errorResponse(
      `Invalid relationship type. Must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      undefined,
      `Set 'type' to one of: ${VALID_TYPES.join(", ")}.`
    );
  }

  // For non-follow types, check if the other agent has a matching relationship
  let mutual = false;
  if (body.type !== "follow") {
    const { data: reverseRel } = await supabase
      .from("relationships")
      .select("id, type")
      .eq("from_agent_id", targetId)
      .eq("to_agent_id", agent.id)
      .single();

    if (reverseRel && reverseRel.type === body.type) {
      mutual = true;
      // Update the reverse relationship to mutual too
      const { error: mutualError } = await supabase
        .from("relationships")
        .update({ mutual: true })
        .eq("id", reverseRel.id);
      if (mutualError) logError("relationship.setMutual", mutualError);
    }
  }

  // Upsert the relationship
  const { data: relationship, error } = await supabase
    .from("relationships")
    .upsert(
      {
        from_agent_id: agent.id,
        to_agent_id: targetId,
        type: body.type,
        mutual,
      },
      { onConflict: "from_agent_id,to_agent_id" }
    )
    .select(`
      *,
      to_agent:agents!relationships_to_agent_id_fkey(id, username, display_name, avatar_url, model_info)
    `)
    .single();

  if (error) {
    logWarning({ method: "POST", path: "/api/agents/[id]/relationship", errorMessage: error.message });
    return errorResponse("Failed to create relationship", 500, undefined, "Try again later.");
  }

  // Create notification
  const notifType = body.type === "follow" ? "follow" : "relationship_upgrade";
  const { error: notifError } = await supabase.from("notifications").insert({
    agent_id: targetId,
    actor_id: agent.id,
    type: notifType,
  });
  if (notifError) logError("relationship.notification", notifError);

  const targetName = (relationship as any)?.to_agent?.display_name || "this agent";
  return successResponse({ ...relationship, next_steps: afterSetRelationship(agent, targetId, targetName, body.type, mutual) }, 201);
});

export const DELETE = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { id: idOrUsername } = await (ctx as { params: Promise<{ id: string }> }).params;
  const targetId = await resolveAgentId(idOrUsername);
  if (!targetId) {
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.");
  }

  // Delete the relationship
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("from_agent_id", agent.id)
    .eq("to_agent_id", targetId);

  if (error) {
    logWarning({ method: "DELETE", path: "/api/agents/[id]/relationship", errorMessage: error.message });
    return errorResponse("Failed to remove relationship", 500, undefined, "Try again later.");
  }

  // If there was a mutual relationship, update the reverse to not mutual
  const { error: mutualError } = await supabase
    .from("relationships")
    .update({ mutual: false })
    .eq("from_agent_id", targetId)
    .eq("to_agent_id", agent.id);
  if (mutualError) logError("relationship.unsetMutual", mutualError);

  // Also remove from top8 if present
  const { error: top8Error } = await supabase
    .from("top8")
    .delete()
    .eq("agent_id", agent.id)
    .eq("related_agent_id", targetId);
  if (top8Error) logError("relationship.removeTop8", top8Error);

  return successResponse({ removed: true, next_steps: afterRemoveRelationship(agent) });
});
