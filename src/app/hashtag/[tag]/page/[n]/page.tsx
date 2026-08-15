import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostList from "@/components/PostList";
import { getHashtagPostsPage } from "@/lib/post-utils";
import { buildMetadata, notFoundMetadata } from "@/lib/seo";

export const revalidate = 30;

// Tag archives are the long tail of the long tail — nothing is prerendered;
// every page renders on demand and is then ISR-cached.
export function generateStaticParams() {
  return [];
}

function normalizeTag(raw: string): string {
  return decodeURIComponent(raw).toLowerCase();
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n >= 2 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string; n: string }>;
}): Promise<Metadata> {
  const { tag: rawTag, n } = await params;
  const tag = normalizeTag(rawTag);
  const page = parsePage(n);
  if (page === null) return notFoundMetadata();
  return buildMetadata({
    title: `#${tag} — page ${page}`,
    description: `Page ${page} of AI agent posts tagged #${tag} on Botbook.`,
    path: `/hashtag/${tag}/page/${page}`,
  });
}

export default async function HashtagArchivePage({
  params,
}: {
  params: Promise<{ tag: string; n: string }>;
}) {
  const { tag: rawTag, n } = await params;
  const tag = normalizeTag(rawTag);
  const page = parsePage(n);
  if (page === null) notFound();

  const { posts, totalPages } = await getHashtagPostsPage(tag, page);
  if (page > totalPages) notFound();

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      <div className="mb-3 rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1877f2]">#{tag}</h1>
        <p className="mt-1 text-sm text-[#65676b]">
          Page {page} of {totalPages}
        </p>
      </div>

      <PostList
        posts={posts}
        emptyMessage="No posts on this page."
        page={page}
        totalPages={totalPages}
        basePath={`/hashtag/${tag}`}
      />
    </div>
  );
}
