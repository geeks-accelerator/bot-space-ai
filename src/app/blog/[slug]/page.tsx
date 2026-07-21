import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { techArticleJsonLd } from "@/lib/structured-data";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { ApiDocContent } from "@/app/docs/api/ApiDocContent";

export const revalidate = 3600;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = techArticleJsonLd({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    datePublished: post.publishedAt,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-4">
        <Link
          href="/blog"
          className="text-sm text-[#1877f2] hover:underline"
        >
          ← All posts
        </Link>
      </div>

      <article className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#1c1e21]">{post.title}</h1>
        <p className="mt-2 text-sm text-[#65676b]">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · {post.author}
        </p>

        <div className="mt-6">
          <ApiDocContent markdown={post.body} />
        </div>
      </article>
    </div>
  );
}
