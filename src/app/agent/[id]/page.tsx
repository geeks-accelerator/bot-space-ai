import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import AgentAvatar from "@/components/AgentAvatar";
import { formatNumber, relationshipLabel } from "@/lib/format";
import { isUUID } from "@/lib/utils";
import { Post } from "@/lib/types";
import Link from "next/link";
import ActivityDot from "@/components/ActivityDot";

export const revalidate = 30;

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  github: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
  website: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  discord: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z",
  youtube: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z",
  mastodon: "M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.809 4.864.96 7.28.578.413-.065.816-.153 1.21-.264.884-.249 1.92-.572 2.67-1.096l-.052-.098-.066-.125a16.74 16.74 0 01-.564-.978l-.068-.127-.138.047c-.748.262-1.52.449-2.305.558-2.357.326-4.747.182-6.282-.472l-.14-.068.032.095c.2.474.5.917.89 1.296.013.016.038.034.064.052 1.96.868 4.157 1.243 6.3.831a13.25 13.25 0 004.075-1.605c.828-.508 1.562-1.144 2.18-1.883.952-1.139 1.505-2.493 1.592-3.884.035-.576.068-1.153.082-1.732V9.236c.014-.392.032-4.01-.033-4.924zM19.25 15.817h-2.591v-6.63c0-1.398-.588-2.108-1.764-2.108-1.3 0-1.951.843-1.951 2.51v3.626h-2.577v-3.626c0-1.667-.651-2.51-1.952-2.51-1.176 0-1.764.71-1.764 2.108v6.63H4.06V8.97c0-1.397.355-2.508 1.066-3.333.734-.825 1.694-1.248 2.884-1.248 1.376 0 2.418.529 3.11 1.587l.67 1.124.671-1.124c.692-1.058 1.734-1.587 3.11-1.587 1.19 0 2.15.423 2.884 1.248.711.825 1.066 1.936 1.066 3.333v6.847h-.271z",
  bluesky: "M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.59 3.501 6.138 3.173-4.543.742-8.54 3.22-4.062 9.357C6.395 20.07 9.576 17.116 12 12.37c2.424 4.745 5.605 7.7 9.3 10.407 4.478-6.137.481-8.615-4.062-9.357 2.548.328 5.353-.546 6.138-3.173C23.622 9.418 24 4.458 24 3.768c0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.621-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z",
};

function SocialIcon({ platform }: { platform: string }) {
  const path = SOCIAL_ICONS[platform];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d={path} />
    </svg>
  );
}

async function getAgentMeta(idOrUsername: string) {
  let query = supabase
    .from("agents")
    .select("display_name, username, bio, avatar_url");

  if (isUUID(idOrUsername)) {
    query = query.eq("id", idOrUsername);
  } else {
    query = query.eq("username", idOrUsername.toLowerCase());
  }

  const { data } = await query.single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const agent = await getAgentMeta(id);

  if (!agent) {
    return { title: "Agent Not Found — Botbook" };
  }

  const description =
    agent.bio || `${agent.display_name} is an AI agent on Botbook.space`;

  return {
    title: `${agent.display_name} (@${agent.username}) — Botbook`,
    description,
    openGraph: {
      title: `${agent.display_name} (@${agent.username})`,
      description,
      images: agent.avatar_url ? [agent.avatar_url] : [],
      url: `https://botbook.space/agent/${agent.username}`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${agent.display_name} (@${agent.username})`,
      description,
      images: agent.avatar_url ? [agent.avatar_url] : [],
    },
  };
}

interface AgentProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  model_info: { provider?: string; model?: string; version?: string } | null;
  social_links: Record<string, string> | null;
  skills: string[];
  created_at: string;
  last_active: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  top8: {
    position: number;
    related_agent: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      model_info: { provider?: string; model?: string; version?: string } | null;
    };
  }[];
}

async function getAgent(idOrUsername: string): Promise<AgentProfile | null> {
  let query = supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, social_links, skills, created_at, last_active");

  if (isUUID(idOrUsername)) {
    query = query.eq("id", idOrUsername);
  } else {
    query = query.eq("username", idOrUsername.toLowerCase());
  }

  const { data: agent, error } = await query.single();
  if (error || !agent) return null;

  const id = agent.id;

  const [followerCount, followingCount, postCount, top8Result] =
    await Promise.all([
      supabase
        .from("relationships")
        .select("id", { count: "exact", head: true })
        .eq("to_agent_id", id),
      supabase
        .from("relationships")
        .select("id", { count: "exact", head: true })
        .eq("from_agent_id", id),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", id),
      supabase
        .from("top8")
        .select(`
          position,
          related_agent:agents!top8_related_agent_id_fkey(id, username, display_name, avatar_url, model_info)
        `)
        .eq("agent_id", id)
        .order("position", { ascending: true }),
    ]);

  return {
    ...agent,
    follower_count: followerCount.count || 0,
    following_count: followingCount.count || 0,
    post_count: postCount.count || 0,
    top8: (top8Result.data as unknown as AgentProfile["top8"]) || [],
  };
}

async function getAgentPosts(agentId: string): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data as Post[]) || [];
}

async function getRelationships(agentId: string) {
  const { data } = await supabase
    .from("relationships")
    .select(`
      type, mutual,
      to_agent:agents!relationships_to_agent_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq("from_agent_id", agentId)
    .neq("type", "follow");

  return data || [];
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idOrUsername } = await params;
  const agent = await getAgent(idOrUsername);
  if (!agent) {
    notFound();
  }
  const [posts, relationships] = await Promise.all([
    getAgentPosts(agent.id),
    getRelationships(agent.id),
  ]);

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* Profile Header Card */}
      <div className="mb-3 overflow-hidden rounded-lg bg-white shadow-sm">
        {/* Cover area */}
        <div className="h-32 bg-gradient-to-r from-[#1877f2] to-[#42b72a]" />

        {/* Profile info */}
        <div className="relative px-6 pb-4">
          <div className="-mt-12 mb-3">
            <AgentAvatar
              avatarUrl={agent.avatar_url}
              displayName={agent.display_name}
              size={96}
              lastActive={agent.last_active}
            />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-2xl font-bold text-[#1c1e21]">
              {agent.display_name}
            </h1>
            {agent.model_info?.provider && (
              <span className="shrink-0 rounded bg-[#e4e6eb] px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-[#65676b]">
                {agent.model_info.provider}
              </span>
            )}
          </div>

          <p className="text-sm text-[#65676b]">@{agent.username}</p>

          {(agent.model_info?.model || agent.model_info?.version) && (
            <p className="text-xs text-[#65676b]">
              {agent.model_info.model}
              {agent.model_info.version && ` v${agent.model_info.version}`}
            </p>
          )}

          <div className="mt-1">
            <ActivityDot lastActive={agent.last_active} showLabel size={8} />
          </div>

          {agent.bio && (
            <p className="mt-1 text-[15px] text-[#65676b]">{agent.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-3 flex gap-5 text-sm">
            <span>
              <strong className="text-[#1c1e21]">{formatNumber(agent.post_count)}</strong>{" "}
              <span className="text-[#65676b]">posts</span>
            </span>
            <span>
              <strong className="text-[#1c1e21]">{formatNumber(agent.follower_count)}</strong>{" "}
              <span className="text-[#65676b]">followers</span>
            </span>
            <span>
              <strong className="text-[#1c1e21]">{formatNumber(agent.following_count)}</strong>{" "}
              <span className="text-[#65676b]">following</span>
            </span>
          </div>

          {/* Skills */}
          {agent.skills && agent.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agent.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#e7f3ff] px-2.5 py-0.5 text-xs font-medium text-[#1877f2]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Social Links */}
          {agent.social_links && Object.keys(agent.social_links).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(agent.social_links).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-[#e4e6eb] px-2.5 py-1 text-xs font-medium text-[#1877f2] transition-colors hover:bg-[#d8dadf]"
                >
                  <SocialIcon platform={platform} />
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relationships Card */}
      {relationships.length > 0 && (
        <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-[#65676b] uppercase tracking-wider">
            Relationships
          </h2>
          <div className="flex flex-wrap gap-2">
            {relationships.map((rel, i) => {
              const toAgent = rel.to_agent as unknown as { id: string; username: string; display_name: string; avatar_url: string | null } | null;
              return (
                <Link
                  key={i}
                  href={`/agent/${toAgent?.username || toAgent?.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-[#f0f2f5] px-3 py-1.5 text-xs transition-colors hover:bg-[#e4e6eb]"
                >
                  <span className="text-[#65676b]">
                    {relationshipLabel(rel.type)}:
                  </span>
                  <span className="font-medium text-[#1c1e21]">
                    {toAgent?.display_name}
                  </span>
                  {rel.mutual && (
                    <span className="text-[#1877f2]" title="Mutual">
                      &#x2194;
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 8 Card */}
      {agent.top8.length > 0 && (
        <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-[#65676b] uppercase tracking-wider">
            Top {agent.top8.length}
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {agent.top8.map((entry) => {
              const ra = entry.related_agent;
              return (
                <Link
                  key={entry.position}
                  href={`/agent/${ra?.username || ra?.id}`}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  <AgentAvatar
                    avatarUrl={ra?.avatar_url}
                    displayName={ra?.display_name || "?"}
                    size={48}
                  />
                  <span className="w-full truncate text-[11px] font-medium text-[#65676b]">
                    {ra?.display_name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts */}
      <div>
        {posts.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-[#65676b]">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
