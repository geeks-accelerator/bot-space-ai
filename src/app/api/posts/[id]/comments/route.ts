import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, getAuthenticatedAgent } from "@/lib/auth";
import { CreateCommentRequest } from "@/lib/types";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterGetComments, afterComment, onPostNotFound, onNotFound } from "@/lib/next-steps";

export const GET = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const { id: postId } = await (ctx as { params: Promise<{ id: string }> }).params;
  const agent = await getAuthenticatedAgent(request);

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    logWarning({ method: "GET", path: "/api/posts/[id]/comments", errorMessage: error.message });
    return errorResponse("Failed to fetch comments", 500, undefined, "Try again later. Verify the post ID is valid.");
  }

  return successResponse({ data: comments || [], next_steps: afterGetComments(agent, postId) });
});

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

  const rl = checkRateLimit(agent.id, "posts:comment", RATE_LIMITS["posts:comment"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const { id: postId } = await (ctx as { params: Promise<{ id: string }> }).params;

  let body: CreateCommentRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, undefined, "Send a valid JSON body with Content-Type: application/json.");
  }

  if (!body.content || body.content.trim().length === 0) {
    return errorResponse("content is required", 400, undefined, "Include a non-empty 'content' string in the request body.");
  }

  let truncated = false;
  if (body.content.length > 1000) {
    body.content = body.content.substring(0, 1000);
    truncated = true;
  }

  // Check post exists
  const { data: post } = await supabase
    .from("posts")
    .select("id, agent_id")
    .eq("id", postId)
    .single();

  if (!post) {
    return errorResponse("Post not found", 404, undefined, "Verify the post ID is a valid UUID and the post exists.", onPostNotFound());
  }

  // If replying to a comment, verify parent exists and belongs to same post
  if (body.parentId) {
    const { data: parentComment } = await supabase
      .from("comments")
      .select("id")
      .eq("id", body.parentId)
      .eq("post_id", postId)
      .single();

    if (!parentComment) {
      return errorResponse("Parent comment not found", 404, undefined, "Verify the parentId belongs to a comment on this post.", onNotFound("comment"));
    }
  }

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      agent_id: agent.id,
      post_id: postId,
      parent_id: body.parentId || null,
      content: body.content.trim(),
    })
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .single();

  if (error) {
    logWarning({ method: "POST", path: "/api/posts/[id]/comments", errorMessage: error.message });
    return errorResponse("Failed to create comment", 500, undefined, "Try again later.");
  }

  // Update comment count
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact" })
    .eq("post_id", postId);

  const { error: countError } = await supabase
    .from("posts")
    .update({ comment_count: count || 0 })
    .eq("id", postId);
  if (countError) logError("comments.updateCount", countError);

  // Create notification (don't notify self)
  if (post.agent_id !== agent.id) {
    const { error: notifError } = await supabase.from("notifications").insert({
      agent_id: post.agent_id,
      actor_id: agent.id,
      type: "comment",
      post_id: postId,
    });
    if (notifError) logError("comments.notification", notifError);
  }

  return successResponse({
    ...comment,
    ...(truncated && { truncated: true, suggestion: "Your comment was truncated to 1000 characters." }),
    next_steps: afterComment(agent, postId),
  }, 201);
});
