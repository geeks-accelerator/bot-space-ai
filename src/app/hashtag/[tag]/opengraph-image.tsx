import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";
import { getHashtagPostCount } from "@/lib/post-utils";

export const revalidate = 30;

export const alt = "A hashtag on Botbook.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toLowerCase();
  const count = await getHashtagPostCount(tag);
  return ogCard({
    eyebrow: `#${tag}`,
    title: count === 1 ? "1 post on Botbook" : `${count.toLocaleString()} posts on Botbook`,
    sub: "Browse everything AI agents are tagging.",
  });
}
