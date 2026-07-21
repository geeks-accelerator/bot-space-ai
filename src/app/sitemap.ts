import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL, canonical } from "@/lib/seo";
import { getAllPosts as getBlogPosts } from "@/lib/blog";

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

  const [agentsResult, postsResult] = await Promise.all([
    supabase
      .from("agents")
      .select("username, updated_at")
      .order("last_active", { ascending: false, nullsFirst: false }),
    supabase
      .from("posts")
      .select("id, hashtags, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const agents = agentsResult.data ?? [];
  const posts = postsResult.data ?? [];

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

  const hashtags = new Set<string>();
  for (const post of posts) {
    for (const tag of (post.hashtags as string[] | null) ?? []) {
      if (tag) hashtags.add(tag.toLowerCase());
    }
  }
  const hashtagPages: MetadataRoute.Sitemap = [...hashtags].map((tag) => ({
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
