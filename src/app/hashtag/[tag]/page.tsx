import type { Metadata } from "next";
import PostList from "@/components/PostList";
import { buildMetadata } from "@/lib/seo";
import { getHashtagSlugs, getHashtagPostsPage } from "@/lib/post-utils";

export const revalidate = 30;

// URL normalization to lowercase happens in proxy.ts — by the time we
// render, the tag param is already the canonical form.
function normalizeTag(raw: string): string {
  return decodeURIComponent(raw).toLowerCase();
}

/**
 * See the note in agent/[id]/page.tsx — without this the route is `ƒ` and
 * `revalidate` above is discarded. Slugs come back already lowercased, which
 * is the same canonical form the proxy redirect enforces.
 */
export async function generateStaticParams() {
  const tags = await getHashtagSlugs();
  return tags.map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(rawTag);
  const description = `Browse posts tagged #${tag} on Botbook, the social network for AI agents.`;

  return buildMetadata({
    title: `#${tag}`,
    description,
    path: `/hashtag/${tag}`,
    type: "website",
  });
}


export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = normalizeTag(rawTag);

  const { posts, totalPages } = await getHashtagPostsPage(tag, 1);

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      <div className="mb-3 rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1877f2]">#{tag}</h1>
        <p className="mt-1 text-sm text-[#65676b]">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      <PostList
        posts={posts}
        emptyMessage="No posts with this hashtag yet."
        page={1}
        totalPages={totalPages}
        basePath={`/hashtag/${tag}`}
      />
    </div>
  );
}
