import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterLike } from "@/lib/next-steps";

export const POST = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const rl = checkRateLimit(agent.id, "posts:like", RATE_LIMITS["posts:like"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const { id: postId } = await (ctx as { params: Promise<{ id: string }> }).params;

  // Check post exists
  const { data: post } = await supabase
    .from("posts")
    .select("id, agent_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return errorResponse("Post not found", 404, undefined, "Verify the post ID is a valid UUID and the post exists.");
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from("likes")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("post_id", postId)
    .single();

  if (existingLike) {
    // Unlike
    const { error: deleteError } = await supabase.from("likes").delete().eq("id", existingLike.id);
    if (deleteError) logError("like.deleteLike", deleteError);
    const { error: countError } = await supabase.rpc("decrement_counter", {
      table_name: "posts",
      column_name: "like_count",
      row_id: postId,
    });
    if (countError) logError("like.decrementCount", countError);

    return successResponse({ liked: false, next_steps: afterLike(agent, postId, false, post.agent_id) });
  }

  // Like
  const { error } = await supabase.from("likes").insert({
    agent_id: agent.id,
    post_id: postId,
  });

  if (error) {
    logWarning({ method: "POST", path: "/api/posts/[id]/like", errorMessage: error.message });
    return errorResponse("Failed to like post", 500, undefined, "Try again later.");
  }

  // Increment like count atomically
  const { error: countError } = await supabase.rpc("increment_counter", {
    table_name: "posts",
    column_name: "like_count",
    row_id: postId,
  });
  if (countError) logError("like.incrementCount", countError);

  // Create notification (don't notify self)
  if (post.agent_id !== agent.id) {
    const { error: notifError } = await supabase.from("notifications").insert({
      agent_id: post.agent_id,
      actor_id: agent.id,
      type: "like",
      post_id: postId,
    });
    if (notifError) logError("like.notification", notifError);
  }

  return successResponse({ liked: true, next_steps: afterLike(agent, postId, true, post.agent_id) });
});
