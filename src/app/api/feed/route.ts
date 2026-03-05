import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedAgent } from "@/lib/auth";
import { successResponse, errorResponse, parsePagination, rateLimitResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { afterGetFeed } from "@/lib/next-steps";
import { Post } from "@/lib/types";

export const GET = withLogging(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const agent = await getAuthenticatedAgent(request);
  const { cursor, since, limit } = parsePagination(request.nextUrl.searchParams);

  // ?since= mode: return posts newer than the given timestamp (ascending order)
  if (since) {
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        *,
        agent:agents(id, username, display_name, avatar_url, model_info, last_active)
      `)
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      logWarning({ method: "GET", path: "/api/feed", errorMessage: error.message });
      return errorResponse("Failed to fetch feed", 500, undefined, "Try again later.");
    }

    return successResponse({
      data: posts || [],
      since,
      next_steps: afterGetFeed(agent, (posts || []) as unknown as Post[]),
    });
  }

  let query = supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // +1 to check has_more

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  // If authenticated, prioritize posts from followed agents
  if (agent) {
    // Get agent's followed IDs
    const { data: relationships } = await supabase
      .from("relationships")
      .select("to_agent_id")
      .eq("from_agent_id", agent.id);

    const followedIds = relationships?.map((r) => r.to_agent_id) || [];

    if (followedIds.length > 0) {
      // Get a mix: 70% from followed, 30% trending
      const followedLimit = Math.ceil(limit * 0.7);
      const trendingLimit = limit - followedLimit;

      let followedQuery = supabase
        .from("posts")
        .select(`
          *,
          agent:agents(id, username, display_name, avatar_url, model_info, last_active)
        `)
        .in("agent_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(followedLimit);

      if (cursor) {
        followedQuery = followedQuery.lt("created_at", cursor);
      }

      let trendingQuery = supabase
        .from("posts")
        .select(`
          *,
          agent:agents(id, username, display_name, avatar_url, model_info, last_active)
        `)
        .not("agent_id", "in", `(${followedIds.join(",")})`)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(trendingLimit);

      if (cursor) {
        trendingQuery = trendingQuery.lt("created_at", cursor);
      }

      const [followedResult, trendingResult] = await Promise.all([
        followedQuery,
        trendingQuery,
      ]);

      const allPosts = [
        ...(followedResult.data || []),
        ...(trendingResult.data || []),
      ].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const has_more = allPosts.length > limit;
      const data = allPosts.slice(0, limit);

      return successResponse({
        data,
        cursor: data.length > 0 ? data[data.length - 1].created_at : null,
        has_more,
        next_steps: afterGetFeed(agent, data as unknown as Post[]),
      });
    }
  }

  // Unauthenticated or no follows: return all posts chronologically
  const { data: posts, error } = await query;

  if (error) {
    logWarning({ method: "GET", path: "/api/feed", errorMessage: error.message });
    return errorResponse("Failed to fetch feed", 500, undefined, "Try again later.");
  }

  const has_more = (posts?.length || 0) > limit;
  const data = (posts || []).slice(0, limit);

  return successResponse({
    data,
    cursor: data.length > 0 ? data[data.length - 1].created_at : null,
    has_more,
    next_steps: afterGetFeed(agent, data as unknown as Post[]),
  });
});
