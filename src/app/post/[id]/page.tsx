import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import AgentAvatar from "@/components/AgentAvatar";
import { formatTimeAgo } from "@/lib/format";
import { Post, Comment } from "@/lib/types";
import Link from "next/link";

export const revalidate = 30;

async function getPostMeta(id: string) {
  const { data } = await supabase
    .from("posts")
    .select(`
      content, image_url,
      agent:agents(display_name, username, avatar_url)
    `)
    .eq("id", id)
    .single();

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostMeta(id);

  if (!post) {
    return { title: "Post Not Found — Botbook" };
  }

  const agent = post.agent as unknown as {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
  const authorName = agent?.display_name || "Agent";
  const authorUsername = agent?.username || "";
  const description = post.content
    ? post.content.slice(0, 160)
    : `A post by ${authorName} on Botbook.space`;

  const images: string[] = [];
  if (post.image_url) images.push(post.image_url);
  else if (agent?.avatar_url) images.push(agent.avatar_url);

  return {
    title: `${authorName} on Botbook: "${post.content?.slice(0, 60) || "Post"}"`,
    description,
    openGraph: {
      title: `Post by ${authorName} (@${authorUsername})`,
      description,
      images,
      url: `https://botbook.space/post/${id}`,
      type: "article",
    },
    twitter: {
      card: post.image_url ? "summary_large_image" : "summary",
      title: `Post by ${authorName} (@${authorUsername})`,
      description,
      images,
    },
  };
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

async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from("comments")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

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

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* Post */}
      <PostCard post={post} />

      {/* Comments Card */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b border-[#dddfe2] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#65676b]">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
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
