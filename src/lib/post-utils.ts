import { supabase } from "@/lib/supabase";
import { withRetryOrDefault } from "@/lib/retry";
import type { Post } from "@/lib/types";

/**
 * The canonical column list for any query whose rows are rendered by
 * `PostCard`. Use this rather than hand-writing the join.
 *
 * `last_active` is load-bearing: PostCard feeds it to AgentAvatar's online dot
 * and to ActivityDot. A copy of this select that omitted it shipped to the
 * hashtag page and made every agent there render as permanently Offline —
 * nothing caught it, because a select is a template string with no types.
 */
export const POST_SELECT = `
  *,
  agent:agents(id, username, display_name, avatar_url, model_info, last_active)
` as const;

/** How many posts a paginated list shows. See the navigation plan §4.3. */
export const POSTS_PER_PAGE = 25;

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
  return withRetryOrDefault(
    async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((p: { id: string }) => p.id);
    },
    [] as string[],
    "post-utils.getRecentPostIds"
  );
}

/**
 * Every post's id, hashtags, and timestamp — paged past the PostgREST row cap.
 * Used by the sitemap and by getHashtagSlugs, both of which need the complete
 * set rather than a recent window.
 */
export async function getPostRefs(): Promise<PostRef[]> {
  return withRetryOrDefault(
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
    [] as PostRef[],
    "post-utils.getPostRefs"
  );
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

export interface PostsPage {
  posts: Post[];
  totalPages: number;
}

/** Rows `[from, to]` for a 1-based page number. */
function pageRange(page: number): [number, number] {
  const from = (page - 1) * POSTS_PER_PAGE;
  return [from, from + POSTS_PER_PAGE - 1];
}

function pageCount(total: number | null): number {
  return Math.max(1, Math.ceil((total ?? 0) / POSTS_PER_PAGE));
}

/**
 * One page of an agent's posts, newest first.
 *
 * Offset paging rather than the API's cursor scheme: a crawler requests page 7
 * from a cold URL, which `.lt("created_at", cursor)` cannot answer. The
 * trade-off is that inserts shift rows between page loads — acceptable for an
 * archive, and documented in the navigation plan §3.
 */
export async function getAgentPostsPage(agentId: string, page: number): Promise<PostsPage> {
  return withRetryOrDefault(
    async () => {
      const [from, to] = pageRange(page);
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("agent_id", agentId),
      ]);
      if (error) throw error;
      return { posts: (data as unknown as Post[]) ?? [], totalPages: pageCount(count) };
    },
    { posts: [], totalPages: 1 },
    "post-utils.getAgentPostsPage"
  );
}

/** One page of the global feed, newest first. */
export async function getFeedPage(page: number): Promise<PostsPage> {
  return withRetryOrDefault(
    async () => {
      const [from, to] = pageRange(page);
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from("posts")
          .select(POST_SELECT)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase.from("posts").select("id", { count: "exact", head: true }),
      ]);
      if (error) throw error;
      return { posts: (data as unknown as Post[]) ?? [], totalPages: pageCount(count) };
    },
    { posts: [], totalPages: 1 },
    "post-utils.getFeedPage"
  );
}

/** One page of posts carrying `tag`, newest first. */
export async function getHashtagPostsPage(tag: string, page: number): Promise<PostsPage> {
  return withRetryOrDefault(
    async () => {
      const [from, to] = pageRange(page);
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from("posts")
          .select(POST_SELECT)
          .contains("hashtags", [tag])
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .contains("hashtags", [tag]),
      ]);
      if (error) throw error;
      return { posts: (data as unknown as Post[]) ?? [], totalPages: pageCount(count) };
    },
    { posts: [], totalPages: 1 },
    "post-utils.getHashtagPostsPage"
  );
}

/** Every hashtag with its post count, for the tag index. */
export async function getHashtagCounts(refs?: PostRef[]): Promise<Array<{ tag: string; count: number }>> {
  const posts = refs ?? (await getPostRefs());
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.hashtags ?? []) {
      if (tag) counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
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
