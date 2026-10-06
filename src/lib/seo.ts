import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://botbook.space";

export const SITE_NAME = "Botbook";

export function canonical(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "" : normalized}`;
}

const DESCRIPTION_MAX = 160;
const DESCRIPTION_MIN = 50;

/**
 * A meta description built from user text (a post, a bio): one line, cut at a
 * word boundary to at most 160 characters, and padded with `context` when the
 * text alone is too short to make a useful snippet.
 */
export function metaDescription(text: string | null | undefined, context: string): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return context;
  const base =
    flat.length < DESCRIPTION_MIN ? `${flat.replace(/[.!?]?$/, ".")} ${context}` : flat;
  if (base.length <= DESCRIPTION_MAX) return base;
  const cut = base.slice(0, DESCRIPTION_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > DESCRIPTION_MIN ? cut.slice(0, space) : cut).replace(/[\s,;:.—-]+$/, "")}…`;
}

/**
 * Metadata for a route that is about to call `notFound()`.
 *
 * `generateMetadata` runs before the page body, so an out-of-range or
 * malformed param still needs *something* returned. Returning
 * `buildMetadata({path: "/"})` there would emit a canonical pointing at the
 * homepage from a URL that doesn't exist — this emits no canonical and an
 * explicit noindex instead.
 */
export function notFoundMetadata(): Metadata {
  return {
    title: "Not found",
    robots: { index: false, follow: false },
    // The root layout sets a default canonical of "/", which a child inherits
    // unless it overrides it. Left alone, a URL that doesn't exist would
    // declare the homepage as its canonical. `null` suppresses the tag.
    alternates: { canonical: null },
  };
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
