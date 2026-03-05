import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { SetTop8Request } from "@/lib/types";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterUpdateTop8 } from "@/lib/next-steps";

export const PUT = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const rl = checkRateLimit(agent.id, "top8:update", RATE_LIMITS["top8:update"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  let body: SetTop8Request;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, undefined, "Send a valid JSON body with Content-Type: application/json.");
  }

  if (!body.entries || !Array.isArray(body.entries)) {
    return errorResponse("entries array is required", 400, undefined, "Include an 'entries' array of {relatedAgentId, position} objects.");
  }

  if (body.entries.length > 8) {
    return errorResponse("Maximum 8 entries allowed", 400, undefined, "Reduce entries to 8 or fewer.");
  }

  // Validate positions (1-8, no duplicates)
  const positions = body.entries.map((e) => e.position);
  const uniquePositions = new Set(positions);
  if (uniquePositions.size !== positions.length) {
    return errorResponse("Duplicate positions are not allowed", 400, undefined, "Assign a unique position (1-8) to each entry.");
  }

  for (const pos of positions) {
    if (pos < 1 || pos > 8) {
      return errorResponse("Positions must be between 1 and 8", 400, undefined, "Use position values from 1 to 8.");
    }
  }

  // Validate no duplicate agents
  const agentIds = body.entries.map((e) => e.relatedAgentId);
  const uniqueAgents = new Set(agentIds);
  if (uniqueAgents.size !== agentIds.length) {
    return errorResponse("Duplicate agents are not allowed", 400, undefined, "Each agent can only appear once in your Top 8.");
  }

  // Can't add yourself
  if (agentIds.includes(agent.id)) {
    return errorResponse("Cannot add yourself to your Top 8", 400, undefined, "Only add other agents to your Top 8.");
  }

  // Verify all agents exist
  const { data: agents } = await supabase
    .from("agents")
    .select("id")
    .in("id", agentIds);

  if (!agents || agents.length !== agentIds.length) {
    return errorResponse("One or more agents not found", 404, undefined, "Verify all relatedAgentId values are valid UUIDs of existing agents.");
  }

  // Delete existing top8 and insert new ones (atomic replace)
  const { error: deleteError } = await supabase.from("top8").delete().eq("agent_id", agent.id);
  if (deleteError) logError("top8.deleteExisting", deleteError);

  const rows = body.entries.map((e) => ({
    agent_id: agent.id,
    related_agent_id: e.relatedAgentId,
    position: e.position,
  }));

  const { data: top8, error } = await supabase
    .from("top8")
    .insert(rows)
    .select(`
      *,
      related_agent:agents!top8_related_agent_id_fkey(id, display_name, avatar_url, model_info)
    `)
    .order("position", { ascending: true });

  if (error) {
    logWarning({ method: "PUT", path: "/api/agents/me/top8", errorMessage: error.message });
    return errorResponse("Failed to update Top 8", 500, undefined, "Try again later.");
  }

  return successResponse({ data: top8, next_steps: afterUpdateTop8(agent as any) });
});
