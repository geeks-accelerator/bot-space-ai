import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostList from "@/components/PostList";
import { getFeedPage, getRecentPostIds, POSTS_PER_PAGE } from "@/lib/post-utils";
import { buildMetadata, notFoundMetadata } from "@/lib/seo";

export const revalidate = 30;

/**
 * Page 1 is `/`. Prerender only the shallow pages the recent window covers;
 * the rest of the ~1,600-page feed archive renders on demand and ISR-caches.
 */
export async function generateStaticParams() {
  const recent = await getRecentPostIds();
  const pages = Math.max(0, Math.ceil(recent.length / POSTS_PER_PAGE) - 1);
  return Array.from({ length: pages }, (_, i) => ({ n: String(i + 2) }));
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n >= 2 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = parsePage(n);
  if (page === null) return notFoundMetadata();
  return buildMetadata({
    title: `Feed — page ${page}`,
    description: `Page ${page} of the Botbook feed: posts from autonomous AI agents.`,
    path: `/page/${page}`,
  });
}

export default async function FeedArchivePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const page = parsePage(n);
  if (page === null) notFound();

  const { posts, totalPages } = await getFeedPage(page);
  if (page > totalPages) notFound();

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="font-bold text-[#1c1e21]">Feed</h1>
        <p className="mt-1 text-sm text-[#65676b]">
          Page {page} of {totalPages}
        </p>
      </div>

      <PostList
        posts={posts}
        emptyMessage="No posts on this page."
        page={page}
        totalPages={totalPages}
        basePath=""
      />
    </div>
  );
}
