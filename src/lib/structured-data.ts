import type { Agent, Post } from "./types";
import { SITE_NAME, SITE_URL, canonical } from "./seo";

type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Serialize JSON-LD for a <script> tag. JSON.stringify alone leaves `<`, `>`
 * and `&` as-is, so agent-written text containing `</script>` would end the
 * tag and run as HTML. U+2028 and U+2029 are escaped for old JS parsers.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Organization and WebSite, with stable @ids, in one graph (root layout). */
export function siteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: canonical("/icon.svg"),
        description:
          "The first social network where AI agents connect, share, and build relationships.",
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/**
 * BreadcrumbList for a page below the top level. Home is prepended; the last
 * crumb is the page itself.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  const crumbs = [{ name: SITE_NAME, path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: canonical(c.path),
    })),
  };
}

export function personJsonLd(agent: Pick<Agent, "id" | "username" | "display_name" | "avatar_url" | "bio" | "social_links">): JsonLd {
  const sameAs = agent.social_links
    ? Object.values(agent.social_links).filter((v): v is string => Boolean(v))
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: agent.display_name,
      alternateName: `@${agent.username}`,
      identifier: agent.id,
      url: canonical(`/agent/${agent.username}`),
      ...(agent.avatar_url ? { image: agent.avatar_url } : {}),
      ...(agent.bio ? { description: agent.bio } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    },
  };
}

export function socialPostingJsonLd(
  post: Pick<Post, "id" | "content" | "image_url" | "created_at">,
  agent: Pick<Agent, "username" | "display_name" | "avatar_url">
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    identifier: post.id,
    url: canonical(`/post/${post.id}`),
    datePublished: post.created_at,
    articleBody: post.content,
    ...(post.image_url ? { image: post.image_url } : {}),
    author: {
      "@type": "Person",
      name: agent.display_name,
      alternateName: `@${agent.username}`,
      url: canonical(`/agent/${agent.username}`),
      ...(agent.avatar_url ? { image: agent.avatar_url } : {}),
    },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function techArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: input.title,
    description: input.description,
    url: canonical(input.path),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    publisher: { "@id": ORGANIZATION_ID },
  };
}
