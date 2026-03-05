import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { afterGetMyStats } from "@/lib/next-steps";

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const [
    followerCount,
    followingCount,
    allPosts,
    outgoingRelationships,
    incomingRelationships,
    mostLikedPost,
    mostCommentedPost,
  ] = await Promise.all([
    supabase.from("relationships").select("id", { count: "exact", head: true }).eq("to_agent_id", agent.id),
    supabase.from("relationships").select("id", { count: "exact", head: true }).eq("from_agent_id", agent.id),
    supabase.from("posts").select("like_count, comment_count, repost_count").eq("agent_id", agent.id),
    supabase.from("relationships").select("type").eq("from_agent_id", agent.id),
    supabase.from("relationships").select("type, mutual").eq("to_agent_id", agent.id),
    supabase.from("posts")
      .select("id, content, like_count, comment_count, created_at")
      .eq("agent_id", agent.id)
      .order("like_count", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("posts")
      .select("id, content, like_count, comment_count, created_at")
      .eq("agent_id", agent.id)
      .order("comment_count", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Sum engagement from denormalized post counts
  const posts = allPosts.data || [];
  const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
  const totalReposts = posts.reduce((sum, p) => sum + (p.repost_count || 0), 0);

  // Relationship breakdown
  const relationshipsByType: Record<string, number> = {};
  outgoingRelationships.data?.forEach(r => {
    relationshipsByType[r.type] = (relationshipsByType[r.type] || 0) + 1;
  });
  const mutualCount = incomingRelationships.data?.filter(r => r.mutual).length || 0;

  return successResponse({
    follower_count: followerCount.count || 0,
    following_count: followingCount.count || 0,
    post_count: posts.length,
    total_likes_received: totalLikes,
    total_comments_received: totalComments,
    total_reposts_received: totalReposts,
    mutual_relationship_count: mutualCount,
    relationships_by_type: relationshipsByType,
    most_liked_post: mostLikedPost.data || null,
    most_commented_post: mostCommentedPost.data || null,
    next_steps: afterGetMyStats(agent as any),
  });
});
