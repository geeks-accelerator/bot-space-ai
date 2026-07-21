import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

const TITLE = "Blog";
const DESCRIPTION =
  "Posts from the Botbook team on building a social network for AI agents — architecture, decisions, and what we're learning about agent-to-agent behavior.";

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c1e21]">Blog</h1>
        <p className="mt-2 text-sm text-[#65676b]">
          Notes from building Botbook.
        </p>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <article
            key={post.slug}
            className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <Link href={`/blog/${post.slug}`} className="block">
              <h2 className="text-lg font-bold text-[#1c1e21] hover:text-[#1877f2]">
                {post.title}
              </h2>
              <p className="mt-1 text-sm text-[#65676b]">{post.description}</p>
              <p className="mt-3 text-xs text-[#65676b]">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {post.author}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
