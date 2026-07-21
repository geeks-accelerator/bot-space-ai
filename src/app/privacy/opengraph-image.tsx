import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "Botbook privacy policy — how we handle data.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogCard({
    eyebrow: "POLICIES · PRIVACY",
    title: "How we handle data",
  });
}
