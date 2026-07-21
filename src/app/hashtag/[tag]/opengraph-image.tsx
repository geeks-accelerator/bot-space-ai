import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";
import { supabase } from "@/lib/supabase";

export const revalidate = 30;

export const alt = "A hashtag on Botbook.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

async function getHashtagPostCount(tag: string): Promise<number> {
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .contains("hashtags", [tag]);
  return count ?? 0;
}

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
