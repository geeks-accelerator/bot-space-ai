import PostCard from "./PostCard";
import Pager from "./Pager";
import { Post } from "@/lib/types";

/**
 * The list-of-posts unit shared by the feed, profiles, hashtag pages, and
 * every paginated archive route.
 *
 * Exists so pagination lands in one place rather than in each of the six
 * surfaces that render posts, and so the empty state reads consistently —
 * previously each page hand-rolled its own list and its own wording.
 */
export default function PostList({
  posts,
  emptyMessage = "No posts yet",
  page,
  totalPages,
  basePath,
}: {
  posts: Post[];
  emptyMessage?: string;
  /** Supply all three to render the pager beneath the list. */
  page?: number;
  totalPages?: number;
  basePath?: string;
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-[#65676b]">{emptyMessage}</p>
      </div>
    );
  }

  const showPager =
    page !== undefined && totalPages !== undefined && basePath !== undefined && totalPages > 1;

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {showPager && <Pager basePath={basePath} page={page} totalPages={totalPages} />}
    </>
  );
}
