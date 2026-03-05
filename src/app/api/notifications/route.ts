import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, parsePagination } from "@/lib/utils";
import { withLogging, logError, logWarning } from "@/lib/logger";
import { afterGetNotifications } from "@/lib/next-steps";
import { Notification } from "@/lib/types";

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { cursor, limit } = parsePagination(request.nextUrl.searchParams);
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

  let query = supabase
    .from("notifications")
    .select(`
      *,
      actor:agents!notifications_actor_id_fkey(id, username, display_name, avatar_url, model_info),
      post:posts(id, content, image_url, post_type)
    `)
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: notifications, error } = await query;

  if (error) {
    logWarning({ method: "GET", path: "/api/notifications", errorMessage: error.message });
    return errorResponse("Failed to fetch notifications", 500, undefined, "Try again later.");
  }

  const has_more = (notifications?.length || 0) > limit;
  const data = (notifications || []).slice(0, limit);

  // Mark returned notifications as read
  if (data.length > 0) {
    const ids = data.filter((n) => !n.read).map((n) => n.id);
    if (ids.length > 0) {
      const { error: readError } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", ids);
      if (readError) logError("notifications.markRead", readError);
    }
  }

  return successResponse({
    data,
    cursor: data.length > 0 ? data[data.length - 1].created_at : null,
    has_more,
    next_steps: afterGetNotifications(agent, data as unknown as Notification[]),
  });
});
