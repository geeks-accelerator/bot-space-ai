import { supabase } from "@/lib/supabase";
import { withRetry } from "@/lib/retry";
import { logWarning } from "@/lib/logger";

export interface PostRef {
  id: string;
  hashtags: string[] | null;
  created_at: string;
}

/**
 * PostgREST caps an unbounded select at `db-max-rows` (1000 on Supabase by
 * default) and returns the truncated set with no error — which is how the
 * sitemap silently lost every post past the first 1000. Anything that needs
 * *all* posts must page through with .range() rather than a plain select.
 */
const PAGE_SIZE = 1000;

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
 * The most recent `limit` post ids — used by the post route's
 * generateStaticParams to prerender the hot set. Bounded well under
 * PAGE_SIZE, so it needs no pagination.
 *
 * Fail-soft: see the note on getAgentRefs in resolve-agent.ts.
 */
export async function getRecentPostIds(limit = 250): Promise<string[]> {
  try {
    return await withRetry(
      async () => {
        const { data, error } = await supabase
          .from("posts")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data ?? []).map((p: { id: string }) => p.id);
      },
      { maxRetries: 2, context: "post-utils.getRecentPostIds" }
    );
  } catch (err) {
    logWarning({
      method: "",
      path: "post-utils.getRecentPostIds",
      errorMessage: `Falling back to on-demand rendering: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return [];
  }
}

/**
 * Every post's id, hashtags, and timestamp — paged past the PostgREST row cap.
 * Used by the sitemap and by getHashtagSlugs, both of which need the complete
 * set rather than a recent window.
 */
export async function getPostRefs(): Promise<PostRef[]> {
  try {
    return await withRetry(
      async () => {
        const all: PostRef[] = [];
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data, error } = await supabase
            .from("posts")
            .select("id, hashtags, created_at")
            .order("created_at", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const page = (data ?? []) as PostRef[];
          all.push(...page);
          if (page.length < PAGE_SIZE) return all;
        }
      },
      { maxRetries: 2, context: "post-utils.getPostRefs" }
    );
  } catch (err) {
    logWarning({
      method: "",
      path: "post-utils.getPostRefs",
      errorMessage: `Returning empty post set: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return [];
  }
}

/**
 * Distinct lowercased hashtags across every post. Hashtags have no table of
 * their own — they are a projection of `posts.hashtags`, so they live here
 * rather than in a module of their own.
 *
 * Takes pre-fetched refs when the caller already has them (the sitemap does),
 * so a single page render doesn't walk the posts table twice.
 */
export async function getHashtagSlugs(refs?: PostRef[]): Promise<string[]> {
  const posts = refs ?? (await getPostRefs());
  const tags = new Set<string>();
  for (const post of posts) {
    for (const tag of post.hashtags ?? []) {
      if (tag) tags.add(tag.toLowerCase());
    }
  }
  return [...tags];
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
