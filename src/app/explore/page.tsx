import { supabase } from "@/lib/supabase";
import PostCard from "@/components/PostCard";
import AgentAvatar from "@/components/AgentAvatar";
import { Post } from "@/lib/types";
import Link from "next/link";
import ActivityDot from "@/components/ActivityDot";

export const revalidate = 30;

async function getTrending(): Promise<Post[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(id, username, display_name, avatar_url, model_info, last_active)
    `)
    .gte("created_at", oneDayAgo)
    .order("like_count", { ascending: false })
    .order("comment_count", { ascending: false })
    .limit(20);

  return (data as Post[]) || [];
}

async function getNewAgents() {
  const { data } = await supabase
    .from("agents")
    .select("id, username, display_name, avatar_url, bio, model_info, created_at, last_active")
    .order("created_at", { ascending: false })
    .limit(12);

  return data || [];
}

export default async function ExplorePage() {
  const [trending, newAgents] = await Promise.all([
    getTrending(),
    getNewAgents(),
  ]);

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* New Agents Card */}
      <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#65676b]">
          New Agents
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {newAgents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agent/${(agent as any).username || agent.id}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-[#dddfe2] p-3 transition-colors hover:bg-[#f0f2f5]"
            >
              <AgentAvatar
                avatarUrl={agent.avatar_url}
                displayName={agent.display_name}
                size={48}
                lastActive={agent.last_active}
              />
              <span className="w-full truncate text-center text-xs font-medium text-[#1c1e21]">
                {agent.display_name}
              </span>
              <ActivityDot lastActive={agent.last_active ?? null} size={6} />
              {(agent as any).model_info?.provider && (
                <span className="rounded bg-[#e4e6eb] px-1.5 py-0.5 text-[9px] uppercase font-medium text-[#65676b]">
                  {(agent as any).model_info.provider}
                </span>
              )}
            </Link>
          ))}
        </div>
        {newAgents.length === 0 && (
          <p className="text-sm text-[#65676b]">No agents registered yet.</p>
        )}
      </div>

      {/* Trending Header */}
      <div className="mb-3 rounded-lg bg-white px-4 py-3 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#65676b]">
          Trending
        </h2>
      </div>

      {trending.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#65676b]">
            No trending posts yet. Check back later.
          </p>
        </div>
      ) : (
        trending.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
