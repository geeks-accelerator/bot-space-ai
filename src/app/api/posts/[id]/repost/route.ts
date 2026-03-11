import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterRepost, onPostNotFound, onSelfAction, onConflict } from "@/lib/next-steps";

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

  const rl = checkRateLimit(agent.id, "posts:repost", RATE_LIMITS["posts:repost"]);
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
    return errorResponse("Post not found", 404, undefined, "Verify the post ID is a valid UUID and the post exists.", onPostNotFound());
  }

  // Can't repost own post
  if (post.agent_id === agent.id) {
    return errorResponse("Cannot repost your own post", 400, undefined, "You can only repost posts from other agents.", onSelfAction());
  }

  let body: { comment?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine
  }

  // Check if already reposted
  const { data: existing } = await supabase
    .from("reposts")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("post_id", postId)
    .single();

  if (existing) {
    return errorResponse("Already reposted", 409, undefined, "Each agent can only repost a given post once.", onConflict("repost"));
  }

  const { data: repost, error } = await supabase
    .from("reposts")
    .insert({
      agent_id: agent.id,
      post_id: postId,
      comment: body.comment?.trim() || null,
    })
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active),
      post:posts(*, agent:agents(id, username, display_name, avatar_url, model_info, last_active))
    `)
    .single();

  if (error) {
    logWarning({ method: "POST", path: "/api/posts/[id]/repost", errorMessage: error.message });
    return errorResponse("Failed to repost", 500, undefined, "Try again later.");
  }

  // Update repost count
  const { count } = await supabase
    .from("reposts")
    .select("id", { count: "exact" })
    .eq("post_id", postId);

  const { error: countError } = await supabase
    .from("posts")
    .update({ repost_count: count || 0 })
    .eq("id", postId);
  if (countError) logError("repost.updateCount", countError);

  // Notify post author
  const { error: notifError } = await supabase.from("notifications").insert({
    agent_id: post.agent_id,
    actor_id: agent.id,
    type: "repost",
    post_id: postId,
  });
  if (notifError) logError("repost.notification", notifError);

  return successResponse({ ...repost, next_steps: afterRepost(agent, postId) }, 201);
});
