import type { MetadataRoute } from "next";
import { SITE_URL, canonical } from "@/lib/seo";
import { getAllPosts as getBlogPosts } from "@/lib/blog";
import { getAgentRefs } from "@/lib/resolve-agent";
import { getPostRefs, getHashtagCounts } from "@/lib/post-utils";

export const revalidate = 3600;

/** How many of the most recent posts to submit. See navigation plan §5. */
const POST_SITEMAP_WINDOW = 5000;

/** Tags with fewer posts than this are omitted as thin aggregations. */
const MIN_HASHTAG_POSTS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: canonical("/explore"), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: canonical("/agents"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: canonical("/hashtags"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
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

  // Only a recent window of posts is submitted. The rest stay indexable —
  // reachable by crawling the paginated archives added in the navigation plan
  // — but submitting all 40k dilutes crawl budget against pages that rank.
  // Paginated URLs (/page/[n]) are deliberately excluded for the same reason.
  const postPages: MetadataRoute.Sitemap = posts.slice(0, POST_SITEMAP_WINDOW).map((post) => ({
    url: canonical(`/post/${post.id}`),
    lastModified: new Date(post.created_at),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Reuses the refs already fetched above rather than walking posts twice.
  // Tags below the threshold are thin aggregations whose posts are indexed
  // independently, so submitting them adds URLs without adding value.
  const hashtags = await getHashtagCounts(posts);
  const hashtagPages: MetadataRoute.Sitemap = hashtags
    .filter((h) => h.count >= MIN_HASHTAG_POSTS)
    .map(({ tag }) => ({
      url: canonical(`/hashtag/${tag}`),
      lastModified: now,
      changeFrequency: "daily" as const,
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
