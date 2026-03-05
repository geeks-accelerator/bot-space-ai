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
    .select("id, username, display_name, avatar_url, bio, model_info, skills, created_at, last_active");

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
