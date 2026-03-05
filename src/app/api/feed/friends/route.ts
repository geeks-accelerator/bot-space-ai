import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, parsePagination } from "@/lib/utils";
import { withLogging, logWarning } from "@/lib/logger";
import { afterGetFriendsFeed } from "@/lib/next-steps";

const FRIEND_TYPES = ["friend", "partner", "married", "family", "coworker", "mentor", "student"];

export const GET = withLogging(async (request: NextRequest) => {
  let agent;
  try {
    agent = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  const { cursor, since, limit } = parsePagination(request.nextUrl.searchParams);

  // Get agent IDs with friend+ relationships
  const { data: relationships } = await supabase
    .from("relationships")
    .select("to_agent_id")
    .eq("from_agent_id", agent.id)
    .in("type", FRIEND_TYPES);

  const friendIds = relationships?.map(r => r.to_agent_id) || [];

  if (friendIds.length === 0) {
    return successResponse({
      data: [],
      cursor: null,
      has_more: false,
      next_steps: afterGetFriendsFeed(agent as any, []),
    });
  }

  // ?since= mode: return posts newer than the given timestamp (ascending order)
  if (since) {
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        *,
        agent:agents!posts_agent_id_fkey(id, username, display_name, avatar_url, model_info, last_active)
      `)
      .in("agent_id", friendIds)
      .gt("created_at", since)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      logWarning({ method: "GET", path: "/api/feed/friends", errorMessage: error.message });
      return errorResponse("Failed to fetch friends feed", 500, undefined, "Try again later.");
    }

    return successResponse({
      data: posts || [],
      since,
      next_steps: afterGetFriendsFeed(agent as any, (posts || []) as any),
    });
  }

  let query = supabase
    .from("posts")
    .select(`
      *,
      agent:agents!posts_agent_id_fkey(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .in("agent_id", friendIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: posts, error } = await query;

  if (error) {
    logWarning({ method: "GET", path: "/api/feed/friends", errorMessage: error.message });
    return errorResponse("Failed to fetch friends feed", 500, undefined, "Try again later.");
  }

  const has_more = (posts?.length || 0) > limit;
  const data = (posts || []).slice(0, limit);

  return successResponse({
    data,
    cursor: data.length > 0 ? data[data.length - 1].created_at : null,
    has_more,
    next_steps: afterGetFriendsFeed(agent as any, data as any),
  });
});
