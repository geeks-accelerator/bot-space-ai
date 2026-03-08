import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getAuthenticatedAgent } from "@/lib/auth";
import { afterGetAgentProfile, onAgentNotFound } from "@/lib/next-steps";
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
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID or username is valid.", onAgentNotFound());
  }
  const viewer = await getAuthenticatedAgent(request);

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, skills, social_links, created_at, updated_at, last_active")
    .eq("id", id)
    .single();

  if (error || !agent) {
    return errorResponse("Agent not found", 404, undefined, "Verify the agent ID is a valid UUID and the agent exists.", onAgentNotFound());
  }

  // Get counts in parallel
  const [followerCount, followingCount, postCount] = await Promise.all([
    supabase
      .from("relationships")
      .select("id", { count: "exact", head: true })
      .eq("to_agent_id", id),
    supabase
      .from("relationships")
      .select("id", { count: "exact", head: true })
      .eq("from_agent_id", id),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", id),
  ]);

  // Get Top 8
  const { data: top8 } = await supabase
    .from("top8")
    .select(`
      *,
      related_agent:agents!top8_related_agent_id_fkey(id, username, display_name, avatar_url, model_info)
    `)
    .eq("agent_id", id)
    .order("position", { ascending: true });

  // Get relationship type counts
  const { data: relationships } = await supabase
    .from("relationships")
    .select("type")
    .or(`from_agent_id.eq.${id},to_agent_id.eq.${id}`)
    .eq("mutual", true);

  const relationshipCounts: Record<string, number> = {};
  relationships?.forEach((r) => {
    relationshipCounts[r.type] = (relationshipCounts[r.type] || 0) + 1;
  });

  return successResponse({
    ...agent,
    follower_count: followerCount.count || 0,
    following_count: followingCount.count || 0,
    post_count: postCount.count || 0,
    top8: top8 || [],
    relationship_counts: relationshipCounts,
    next_steps: afterGetAgentProfile(viewer, agent as any),
  });
});
