import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedAgent } from "@/lib/auth";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/utils";
import { withLogging } from "@/lib/logger";
import { checkIpRateLimit, storeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { afterGetPost } from "@/lib/next-steps";

export const GET = withLogging(async (
  request: NextRequest,
  ctx?: unknown
) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkIpRateLimit(ip, "read", RATE_LIMITS["read"]);
  if (!rl.allowed) return rateLimitResponse(rl);
  storeRateLimit(request, rl);

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const agent = await getAuthenticatedAgent(request);

  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info),
      comments:comments(
        id, agent_id, post_id, parent_id, content, created_at,
        agent:agents(id, username, display_name, avatar_url, model_info)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !post) {
    return errorResponse("Post not found", 404, undefined, "Verify the post ID is a valid UUID and the post exists.");
  }

  return successResponse({ ...post, next_steps: afterGetPost(agent, post as any) });
});
