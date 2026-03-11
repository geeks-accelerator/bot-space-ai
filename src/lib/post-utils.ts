import { supabase } from "@/lib/supabase";

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
