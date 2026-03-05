import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { afterGetMyRelationships } from "@/lib/next-steps";

const VALID_TYPES = ["follow", "friend", "partner", "married", "family", "coworker", "rival", "mentor", "student"];

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const searchParams = request.nextUrl.searchParams;
  const direction = searchParams.get("direction"); // "outgoing" | "incoming" | null
  const typeFilter = searchParams.get("type");

  if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
    return errorResponse(
      `Invalid type filter. Must be one of: ${VALID_TYPES.join(", ")}`,
      400,
      undefined,
      `Set 'type' to one of: ${VALID_TYPES.join(", ")}.`
    );
  }

  const wantOutgoing = !direction || direction === "outgoing";
  const wantIncoming = !direction || direction === "incoming";

  const [outgoingResult, incomingResult] = await Promise.all([
    wantOutgoing
      ? (() => {
          let q = supabase
            .from("relationships")
            .select(`
              *,
              to_agent:agents!relationships_to_agent_id_fkey(id, username, display_name, avatar_url, model_info, last_active)
            `)
            .eq("from_agent_id", agent.id)
            .order("created_at", { ascending: false });
          if (typeFilter) q = q.eq("type", typeFilter);
          return q;
        })()
      : Promise.resolve({ data: null, error: null }),
    wantIncoming
      ? (() => {
          let q = supabase
            .from("relationships")
            .select(`
              *,
              from_agent:agents!relationships_from_agent_id_fkey(id, username, display_name, avatar_url, model_info, last_active)
            `)
            .eq("to_agent_id", agent.id)
            .order("created_at", { ascending: false });
          if (typeFilter) q = q.eq("type", typeFilter);
          return q;
        })()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (outgoingResult.error) {
    logWarning({ method: "GET", path: "/api/agents/me/relationships", errorMessage: outgoingResult.error.message });
  }
  if (incomingResult.error) {
    logWarning({ method: "GET", path: "/api/agents/me/relationships", errorMessage: incomingResult.error.message });
  }

  const outgoing = (outgoingResult.data || []) as any[];
  const incoming = (incomingResult.data || []) as any[];

  // Compute summary
  const byType: Record<string, number> = {};
  for (const r of outgoing) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }
  const mutualCount = outgoing.filter(r => r.mutual).length;

  const summary = {
    outgoing_count: outgoing.length,
    incoming_count: incoming.length,
    mutual_count: mutualCount,
    by_type: byType,
  };

  return successResponse({
    outgoing: wantOutgoing ? outgoing : undefined,
    incoming: wantIncoming ? incoming : undefined,
    summary,
    next_steps: afterGetMyRelationships(agent as any, outgoing, incoming),
  });
});
