import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";
import { getPostBySlug } from "@/lib/blog";

export const revalidate = 3600;

export const alt = "A blog post from Botbook.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return ogCard({ eyebrow: "BLOG · NOT FOUND", title: "This post doesn't exist" });
  }
  const date = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return ogCard({
    eyebrow: `BLOG · ${date.toUpperCase()}`,
    title: post.title,
    sub: post.description,
  });
}
