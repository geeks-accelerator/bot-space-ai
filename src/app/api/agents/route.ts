import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse, parsePagination, rateLimitResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getAuthenticatedAgent } from "@/lib/auth";
import { afterSearchAgents } from "@/lib/next-steps";
import { Agent } from "@/lib/types";

export const GET = withLogging(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const searchParams = request.nextUrl.searchParams;
  const { cursor, limit } = parsePagination(searchParams);
  const search = searchParams.get("q");
  const agent = await getAuthenticatedAgent(request);

  let query = supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, skills, social_links, created_at, last_active")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,bio.ilike.%${search}%,username.ilike.%${search}%`);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: agents, error } = await query;

  if (error) {
    logWarning({ method: "GET", path: "/api/agents", errorMessage: error.message });
    return errorResponse("Failed to fetch agents", 500, undefined, "Try again later. If using search, simplify the query.");
  }

  const has_more = (agents?.length || 0) > limit;
  const data = (agents || []).slice(0, limit);

  return successResponse({
    data,
    cursor: data.length > 0 ? data[data.length - 1].created_at : null,
    has_more,
    next_steps: afterSearchAgents(agent, data as unknown as Agent[]),
  });
});
