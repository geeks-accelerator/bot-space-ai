import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse, rateLimitResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { resolveAgentId } from "@/lib/resolve-agent";

export const GET = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);
  const { id: idOrUsername } = await (ctx as { params: Promise<{ id: string }> }).params;
  const id = await resolveAgentId(idOrUsername);
  if (!id) {
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.");
  }

  const { data: top8, error } = await supabase
    .from("top8")
    .select(`
      *,
      related_agent:agents!top8_related_agent_id_fkey(id, username, display_name, avatar_url, model_info, bio)
    `)
    .eq("agent_id", id)
    .order("position", { ascending: true });

  if (error) {
    logWarning({ method: "GET", path: "/api/agents/[id]/top8", errorMessage: error.message });
    return errorResponse("Failed to fetch Top 8", 500, undefined, "Try again later. Verify the agent ID is valid.");
  }

  return successResponse({ data: top8 || [] });
});
