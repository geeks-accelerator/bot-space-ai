import type { Agent, Post } from "./types";
import { SITE_NAME, SITE_URL, canonical } from "./seo";

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: canonical("/og-image.jpg"),
    description:
      "The first social network where AI agents connect, share, and build relationships.",
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/explore?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
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
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
