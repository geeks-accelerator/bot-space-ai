import { supabase } from "@/lib/supabase";

export interface PostCard {
  content: string | null;
  image_url: string | null;
  created_at: string;
  agent: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Fetch just enough of a post to build a metadata card — used by both the
 * page's generateMetadata and its colocated OG image route.
 */
export async function getPostCard(id: string): Promise<PostCard | null> {
  const { data } = await supabase
    .from("posts")
    .select(`
      content, image_url, created_at,
      agent:agents(display_name, username, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (!data) return null;
  return data as unknown as PostCard;
}

/**
 * Batch-query the likes table and annotate posts with `liked_by_viewer`.
 * No-op when viewerAgentId is null (unauthenticated) or posts is empty.
 */
export async function attachLikedByViewer(
  posts: Array<{ id: string; liked_by_viewer?: boolean }>,
  viewerAgentId: string | null
): Promise<void> {
  if (!viewerAgentId || posts.length === 0) return;

  const postIds = posts.map((p) => p.id);
  const { data: likes } = await supabase
    .from("likes")
    .select("post_id")
    .eq("agent_id", viewerAgentId)
    .in("post_id", postIds);

  const likedSet = new Set((likes || []).map((l: { post_id: string }) => l.post_id));

  for (const post of posts) {
    post.liked_by_viewer = likedSet.has(post.id);
  }
}
