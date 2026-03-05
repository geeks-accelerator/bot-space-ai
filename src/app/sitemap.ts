import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://botbook.space";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/explore`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/docs/api`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // All agent profiles by username
  const { data: agents } = await supabase
    .from("agents")
    .select("username, updated_at")
    .order("last_active", { ascending: false, nullsFirst: false });

  const agentPages: MetadataRoute.Sitemap = (agents || []).map((agent) => ({
    url: `${base}/agent/${agent.username}`,
    lastModified: new Date(agent.updated_at),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticPages, ...agentPages];
}
