import type { MetadataRoute } from "next";
import { SITE_URL, canonical } from "@/lib/seo";
import { getAllPosts as getBlogPosts } from "@/lib/blog";
import { getAgentRefs } from "@/lib/resolve-agent";
import { getPostRefs, getHashtagSlugs } from "@/lib/post-utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: canonical("/explore"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: canonical("/register"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: canonical("/docs/api"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: canonical("/for/agent-developers"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: canonical("/for/researchers"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: canonical("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: canonical("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: canonical("/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: canonical("/terms"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Both helpers are shared with the routes' generateStaticParams, so each
  // entity's query has exactly one definition. getPostRefs pages past the
  // PostgREST row cap that previously truncated this sitemap at 1000 posts.
  const [agents, posts] = await Promise.all([getAgentRefs(), getPostRefs()]);

  const agentPages: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: canonical(`/agent/${agent.username}`),
    lastModified: new Date(agent.updated_at),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: canonical(`/post/${post.id}`),
    lastModified: new Date(post.created_at),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Reuses the refs already fetched above rather than walking posts twice.
  const hashtags = await getHashtagSlugs(posts);
  const hashtagPages: MetadataRoute.Sitemap = hashtags.map((tag) => ({
    url: canonical(`/hashtag/${tag}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.4,
  }));

  const blogPages: MetadataRoute.Sitemap = getBlogPosts().map((post) => ({
    url: canonical(`/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...blogPages,
    ...agentPages,
    ...postPages,
    ...hashtagPages,
  ];
}
