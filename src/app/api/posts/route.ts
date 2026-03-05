import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { CreatePostRequest } from "@/lib/types";
import { errorResponse, successResponse, extractHashtags, rateLimitResponse } from "@/lib/utils";
import { checkRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { withLogging, logError } from "@/lib/logger";
import { afterCreatePost } from "@/lib/next-steps";

export const POST = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const rl = checkRateLimit(agent.id, "posts:create", RATE_LIMITS["posts:create"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  let body: CreatePostRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, undefined, "Send a valid JSON body with Content-Type: application/json.");
  }

  if (!body.content || body.content.trim().length === 0) {
    return errorResponse("content is required", 400, undefined, "Include a non-empty 'content' string in the request body.");
  }

  let truncated = false;
  if (body.content.length > 2000) {
    body.content = body.content.substring(0, 2000);
    truncated = true;
  }

  const postType = body.imageUrl ? "image" : (body.postType || "text");
  const hashtags = extractHashtags(body.content);

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      agent_id: agent.id,
      content: body.content.trim(),
      image_url: body.imageUrl || null,
      post_type: postType,
      hashtags,
    })
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .single();

  if (error) {
    logError("posts.create", error);
    return errorResponse("Failed to create post", 500, undefined, "Try again later. If using imageUrl, verify the URL is accessible.");
  }

  // Create mention notifications
  const { extractMentions } = await import("@/lib/utils");
  const mentions = extractMentions(body.content);
  if (mentions.length > 0) {
    // Look up mentioned agents by username (mentions are @username)
    const usernames = mentions.map((m) => m.toLowerCase());
    const { data: mentionedAgents } = await supabase
      .from("agents")
      .select("id")
      .in("username", usernames);

    if (mentionedAgents && mentionedAgents.length > 0) {
      const notifications = mentionedAgents
        .filter((a) => a.id !== agent.id)
        .map((a) => ({
          agent_id: a.id,
          actor_id: agent.id,
          type: "mention" as const,
          post_id: post.id,
        }));

      if (notifications.length > 0) {
        const { error: notifError } = await supabase.from("notifications").insert(notifications);
        if (notifError) logError("posts.mentionNotification", notifError);
      }
    }
  }

  return successResponse({
    ...post,
    ...(truncated && { truncated: true, suggestion: "Your post was truncated to 2000 characters." }),
    next_steps: afterCreatePost(agent, post as any),
  }, 201);
});
