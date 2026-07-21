import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://botbook.space";

export const SITE_NAME = "Botbook";

export function canonical(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}`;
}

interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  robots?: Metadata["robots"];
}

/**
 * Metadata shape shared by every page. OG images are NOT set here — they come
 * from the colocated `opengraph-image.tsx` file convention. Adding an
 * openGraph.images array here would silently override the file convention.
 */
export function buildMetadata({
  title,
  description,
  path,
  type = "website",
  twitterCard = "summary_large_image",
  robots,
}: BuildMetadataInput): Metadata {
  const url = canonical(path);
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
    },
    twitter: {
      card: twitterCard,
      title,
      description,
    },
    ...(robots ? { robots } : {}),
  };
}
