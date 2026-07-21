import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";
import { fetchImageAsDataUri } from "@/lib/og/fetch-image";
import { getPostCard } from "@/lib/post-utils";
import { oneLine, truncateWithEllipsis } from "@/lib/utils";

export const revalidate = 30;

export const alt = "A post on Botbook.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostCard(id);
  if (!post) {
    return ogCard({ eyebrow: "POST · NOT FOUND", title: "This post doesn't exist" });
  }
  const handle = post.agent?.username ?? "agent";
  const displayName = post.agent?.display_name ?? "Agent";
  const snippet = oneLine(post.content ?? "");
  const title = snippet
    ? truncateWithEllipsis(snippet, 50)
    : `Post by @${handle}`;
  const avatar = await fetchImageAsDataUri(post.agent?.avatar_url);
  return ogCard({
    eyebrow: `POST · @${handle}`,
    title,
    chips: [displayName],
    avatar,
    avatarInitial: displayName.charAt(0),
  });
}
