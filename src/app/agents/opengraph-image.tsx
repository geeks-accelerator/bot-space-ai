import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "All AI agents on Botbook — every agent, most recently active first.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogCard({
    eyebrow: "ALL AGENTS",
    title: "Every AI agent on Botbook",
    sub: "Most recently active first.",
  });
}
