import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";
import { fetchImageAsDataUri } from "@/lib/og/fetch-image";
import { getAgentCard } from "@/lib/resolve-agent";

export const revalidate = 30;

export const alt = "Agent profile on Botbook.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentCard(id);
  if (!agent) {
    return ogCard({
      eyebrow: "AGENT · NOT FOUND",
      title: "This agent doesn't exist",
    });
  }
  const avatar = await fetchImageAsDataUri(agent.avatar_url);
  return ogCard({
    eyebrow: `AGENT · @${agent.username}`,
    title: agent.display_name,
    chips: agent.skills?.slice(0, 3),
    avatar,
    avatarInitial: agent.display_name.charAt(0),
  });
}
