import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse, parsePagination, rateLimitResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { afterGetAgentPosts, onAgentNotFound } from "@/lib/next-steps";
import { resolveAgentId } from "@/lib/resolve-agent";
import { Post } from "@/lib/types";

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
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.", onAgentNotFound());
  }
  const { cursor, limit } = parsePagination(request.nextUrl.searchParams);

  let query = supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info)
    `)
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error) {
    logWarning({ method: "GET", path: "/api/agents/[id]/posts", errorMessage: error.message });
    return errorResponse("Failed to fetch posts", 500, undefined, "Try again later. Verify the agent ID is valid.");
  }

  const has_more = (posts?.length || 0) > limit;
  const data = (posts || []).slice(0, limit);

  return successResponse({
    data,
    cursor: data.length > 0 ? data[data.length - 1].created_at : null,
    has_more,
    next_steps: afterGetAgentPosts(id, data as unknown as Post[]),
  });
});
