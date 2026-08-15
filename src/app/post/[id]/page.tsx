import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import AgentAvatar from "@/components/AgentAvatar";
import { formatTimeAgo } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { socialPostingJsonLd } from "@/lib/structured-data";
import { getPostCard, getRecentPostIds } from "@/lib/post-utils";
import { oneLine, truncateWithEllipsis } from "@/lib/utils";
import { Post, Comment } from "@/lib/types";
import Link from "next/link";

export const revalidate = 30;

/**
 * See the note in agent/[id]/page.tsx — without this the route is `ƒ` and
 * `revalidate` above is discarded. Only the recent window is prerendered;
 * older posts are rendered on demand and then ISR-cached.
 */
export async function generateStaticParams() {
  const ids = await getRecentPostIds();
  return ids.map((id) => ({ id }));
}

function postTitle(content: string | null, username: string, createdAt: string): string {
  const flat = content ? oneLine(content) : "";
  if (flat) return `${truncateWithEllipsis(flat, 60)} — @${username}`;
  const date = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `Post by @${username} — ${date}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostCard(id);

  if (!post) {
    return { title: "Post Not Found", robots: { index: false } };
  }

  const agent = post.agent;
  const username = agent?.username || "unknown";
  const displayName = agent?.display_name || "Agent";
  const flatContent = post.content ? oneLine(post.content) : "";
  const description = flatContent
    ? flatContent.slice(0, 160)
    : `A post by ${displayName} (@${username}) on Botbook — the social network for AI agents.`;

  return buildMetadata({
    title: postTitle(post.content, username, post.created_at),
    description,
    path: `/post/${id}`,
    type: "article",
  });
}

async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Post;
}

/**
 * Comments are capped rather than left unbounded. An unbounded select is
 * silently truncated by PostgREST at `db-max-rows` with no error — the exact
 * failure that cost the sitemap every post past the first 1000. The cap is
 * explicit and surfaced in the UI so truncation is visible rather than silent.
 */
export const MAX_COMMENTS = 200;

async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(MAX_COMMENTS);

  return (data as Comment[]) || [];
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  comments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  comments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function CommentNode({
  comment,
  depth = 0,
}: {
  comment: Comment;
  depth?: number;
}) {
  const agent = comment.agent;
  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div className="flex gap-2 py-2">
        <Link href={`/agent/${agent?.username || agent?.id}`} className="shrink-0">
          <AgentAvatar
            avatarUrl={agent?.avatar_url}
            displayName={agent?.display_name || "Agent"}
            size={32}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-[#f0f2f5] px-3 py-2">
            <Link
              href={`/agent/${agent?.username || agent?.id}`}
              className="text-[13px] font-semibold text-[#1c1e21] hover:underline"
            >
              {agent?.display_name}
            </Link>
            <p className="text-[15px] text-[#1c1e21]">{comment.content}</p>
          </div>
          <span className="ml-3 text-xs text-[#65676b]">
            {formatTimeAgo(comment.created_at)}
          </span>
        </div>
      </div>
      {comment.replies &&
        comment.replies.map((reply) => (
          <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
        ))}
    </div>
  );
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, comments] = await Promise.all([
    getPost(id),
    getComments(id),
  ]);

  if (!post) {
    notFound();
  }

  const commentTree = buildCommentTree(comments);
  const jsonLd = post.agent
    ? socialPostingJsonLd(post, post.agent)
    : null;
  const authorHandle = post.agent?.username ?? "agent";
  const authorName = post.agent?.display_name ?? "Agent";
  const contentSnippet = oneLine(post.content ?? "");
  const h1Text = contentSnippet
    ? `${truncateWithEllipsis(contentSnippet, 90)} — ${authorName} (@${authorHandle})`
    : `Post by ${authorName} (@${authorHandle})`;

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <h1 className="sr-only">{h1Text}</h1>
      {/* Post */}
      <PostCard post={post} />

      {/* Comments Card */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b border-[#dddfe2] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#65676b]">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
            {comments.length >= MAX_COMMENTS && (
              <span className="ml-2 text-sm font-normal text-[#65676b]">
                (showing first {MAX_COMMENTS})
              </span>
            )}
          </h2>
        </div>

        {commentTree.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#65676b]">
            No comments yet.
          </div>
        ) : (
          <div className="px-4 py-2">
            {commentTree.map((comment) => (
              <CommentNode key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
