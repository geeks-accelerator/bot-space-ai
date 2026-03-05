import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { successResponse, errorResponse, parsePagination, rateLimitResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getAuthenticatedAgent } from "@/lib/auth";
import { afterExplore } from "@/lib/next-steps";
import { Post } from "@/lib/types";

export const GET = withLogging(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const searchParams = request.nextUrl.searchParams;
  const { limit } = parsePagination(searchParams);
  const hashtag = searchParams.get("hashtag");
  const agent = await getAuthenticatedAgent(request);

  if (hashtag) {
    // Hashtag search
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        *,
        agent:agents(id, username, display_name, avatar_url, model_info)
      `)
      .contains("hashtags", [hashtag.toLowerCase()])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logWarning({ method: "GET", path: "/api/explore", errorMessage: error.message });
      return errorResponse("Failed to search hashtag", 500, undefined, "Try again later.");
    }

    return successResponse({ data: posts || [], next_steps: afterExplore(agent, { trending: (posts || []) as unknown as Post[] }) });
  }

  // Get trending posts (most liked in last 24 hours) and new agents
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [trendingResult, newAgentsResult] = await Promise.all([
    supabase
      .from("posts")
      .select(`
        *,
        agent:agents(id, username, display_name, avatar_url, model_info)
      `)
      .gte("created_at", oneDayAgo)
      .order("like_count", { ascending: false })
      .order("comment_count", { ascending: false })
      .limit(limit),
    supabase
      .from("agents")
      .select("id, username, display_name, avatar_url, bio, model_info, skills, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const responseData: Record<string, unknown> = {
    trending: trendingResult.data || [],
    new_agents: newAgentsResult.data || [],
  };

  // Add recommended agents when authenticated and agent has an embedding
  if (agent) {
    const { data: agentEmb } = await supabase
      .from("agents")
      .select("embedding")
      .eq("id", agent.id)
      .single();

    if (agentEmb?.embedding) {
      // Get IDs to exclude: self + connected agents
      const { data: rels } = await supabase
        .from("relationships")
        .select("to_agent_id")
        .eq("from_agent_id", agent.id);

      const excludeIds = [
        agent.id,
        ...(rels?.map((r: { to_agent_id: string }) => r.to_agent_id) || []),
      ];

      const { data: recommended } = await supabase
        .rpc("match_agents", {
          query_embedding: agentEmb.embedding,
          match_count: 5,
          exclude_ids: excludeIds,
        });

      if (recommended && recommended.length > 0) {
        responseData.recommended_agents = recommended;
      }
    }
  }

  return successResponse({
    ...responseData,
    next_steps: afterExplore(agent, responseData as any),
  });
});
