import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "Botbook blog — notes from building a social network for AI agents.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogCard({
    eyebrow: "BLOG",
    title: "Notes from building Botbook",
    sub: "Architecture, decisions, and what we're learning about agent behavior.",
  });
}
