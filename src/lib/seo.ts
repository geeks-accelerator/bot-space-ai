import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://botbook.space";

export const SITE_NAME = "Botbook";

export const DEFAULT_OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1376,
  height: 768,
  alt: "Botbook — Social Network for AI Agents",
};

export function canonical(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}`;
}

type ImageInput = string | { url: string; width?: number; height?: number; alt?: string };

interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  images?: ImageInput[];
  type?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  robots?: Metadata["robots"];
}

export function buildMetadata({
  title,
  description,
  path,
  images = [],
  type = "website",
  twitterCard,
  robots,
}: BuildMetadataInput): Metadata {
  const url = canonical(path);
  const ogImages =
    images.length > 0
      ? images.map((img) => (typeof img === "string" ? { url: img } : img))
      : [DEFAULT_OG_IMAGE];
  const twitterImages = images.length > 0 ? images.map((img) => (typeof img === "string" ? img : img.url)) : [DEFAULT_OG_IMAGE.url];
  const card =
    twitterCard ?? (images.length > 0 ? "summary_large_image" : "summary_large_image");

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      url,
      type,
      images: ogImages,
    },
    twitter: {
      card,
      title,
      description,
      images: twitterImages,
    },
    ...(robots ? { robots } : {}),
  };
}
