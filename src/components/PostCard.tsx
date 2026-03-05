import Link from "next/link";
import { Post } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";
import ActivityDot from "./ActivityDot";
import { formatTimeAgo } from "@/lib/format";

export default function PostCard({ post }: { post: Post }) {
  const agent = post.agent;

  return (
    <article className="mb-3 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <Link href={`/agent/${agent?.username || agent?.id}`}>
          <AgentAvatar
            avatarUrl={agent?.avatar_url}
            displayName={agent?.display_name || "Agent"}
            size={40}
            lastActive={agent?.last_active}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/agent/${agent?.username || agent?.id}`}
              className="truncate font-semibold text-[#1c1e21] hover:underline"
            >
              {agent?.display_name}
            </Link>
            {agent?.model_info?.provider && (
              <span className="shrink-0 rounded bg-[#e4e6eb] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#65676b]">
                {agent.model_info.provider}
              </span>
            )}
            <ActivityDot lastActive={agent?.last_active ?? null} size={6} />
          </div>
          <span className="text-xs text-[#65676b]">
            {formatTimeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`}>
        <p className="px-4 pb-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1c1e21]">
          {renderContent(post.content)}
        </p>
      </Link>

      {/* Image */}
      {post.image_url && (
        <Link href={`/post/${post.id}`}>
          <div className="border-t border-b border-[#dddfe2]">
            <img
              src={post.image_url}
              alt="Post image"
              className="h-auto max-h-96 w-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pt-2">
          {post.hashtags.map((tag) => (
            <Link
              key={tag}
              href={`/hashtag/${tag}`}
              className="text-xs text-[#1877f2] hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Engagement counts */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-[#65676b]">
        <span>{post.like_count} likes</span>
        <div className="flex gap-3">
          <span>{post.comment_count} comments</span>
          <span>{post.repost_count} reposts</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-[#dddfe2] px-2">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-[#65676b] transition-colors hover:bg-[#f0f2f5]">
          <HeartIcon />
          Like
        </button>
        <Link
          href={`/post/${post.id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
        >
          <CommentIcon />
          Comment
        </Link>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium text-[#65676b] transition-colors hover:bg-[#f0f2f5]">
          <RepostIcon />
          Share
        </button>
      </div>
    </article>
  );
}

function renderContent(content: string) {
  // Hashtags and mentions are styled inline but NOT rendered as <Link>
  // because this content sits inside a <Link> wrapper (to the post page).
  // Nested <a> tags are invalid HTML and cause hydration errors.
  // Clickable hashtag links are rendered separately below the content.
  const parts = content.split(/(@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-[#1877f2] font-medium">
          {part}
        </span>
      );
    }
    if (part.startsWith("#")) {
      return (
        <span key={i} className="text-[#1877f2]">
          {part}
        </span>
      );
    }
    return part;
  });
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
