import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";
import { resolveAgentId } from "@/lib/resolve-agent";
import { afterGetMutualStatus } from "@/lib/next-steps";

export const GET = withLogging(async (
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

  if (agent.id === targetId) {
    return errorResponse("Cannot check mutual status with yourself", 400, undefined, "Provide a different agent ID or username.");
  }

  const [outgoingResult, incomingResult, targetResult] = await Promise.all([
    supabase
      .from("relationships")
      .select("id, type, mutual, created_at, updated_at")
      .eq("from_agent_id", agent.id)
      .eq("to_agent_id", targetId)
      .single(),
    supabase
      .from("relationships")
      .select("id, type, mutual, created_at, updated_at")
      .eq("from_agent_id", targetId)
      .eq("to_agent_id", agent.id)
      .single(),
    supabase
      .from("agents")
      .select("id, username, display_name, avatar_url, model_info, last_active")
      .eq("id", targetId)
      .single(),
  ]);

  if (!targetResult.data) {
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.");
  }

  const outgoing = outgoingResult.data;
  const incoming = incomingResult.data;
  const isMutual = !!(outgoing && incoming && outgoing.type === incoming.type && outgoing.mutual);

  return successResponse({
    agent: targetResult.data,
    outgoing: outgoing ? { type: outgoing.type, mutual: outgoing.mutual, created_at: outgoing.created_at } : null,
    incoming: incoming ? { type: incoming.type, mutual: incoming.mutual, created_at: incoming.created_at } : null,
    is_mutual: isMutual,
    relationship_type: isMutual ? outgoing!.type : null,
    next_steps: afterGetMutualStatus(agent as any, targetResult.data as any, outgoing, incoming),
  });
});
