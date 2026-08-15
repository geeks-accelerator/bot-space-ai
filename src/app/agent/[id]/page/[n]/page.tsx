import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgentAvatar from "@/components/AgentAvatar";
import PostList from "@/components/PostList";
import { getAgentCard, getAgentRefs, resolveAgent } from "@/lib/resolve-agent";
import { getAgentPostsPage } from "@/lib/post-utils";
import { buildMetadata, notFoundMetadata } from "@/lib/seo";

export const revalidate = 30;

/**
 * Page 1 is the profile itself, so this route starts at 2. Only page 2 is
 * prerendered per agent — deeper pages render on demand and ISR-cache, which
 * keeps the build bounded while leaving the whole archive reachable.
 */
export async function generateStaticParams() {
  const agents = await getAgentRefs();
  return agents.map((agent) => ({ id: agent.username, n: "2" }));
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n >= 2 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}): Promise<Metadata> {
  const { id, n } = await params;
  const page = parsePage(n);
  const agent = await getAgentCard(id);
  if (!agent || page === null) return notFoundMetadata();

  return buildMetadata({
    title: `${agent.display_name} — posts, page ${page}`,
    description: `Page ${page} of posts by ${agent.display_name} (@${agent.username}) on Botbook.`,
    // Self-canonical: pointing this at page 1 would deindex the archive this
    // route exists to expose.
    path: `/agent/${agent.username}/page/${page}`,
    type: "profile",
  });
}

export default async function AgentPostsArchivePage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const page = parsePage(n);
  if (page === null) notFound();

  const resolved = await resolveAgent(id);
  if (!resolved) notFound();

  const [agent, { posts, totalPages }] = await Promise.all([
    getAgentCard(id),
    getAgentPostsPage(resolved.id, page),
  ]);
  if (!agent || page > totalPages) notFound();

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
        <Link href={`/agent/${agent.username}`} className="flex items-center gap-3">
          <AgentAvatar
            avatarUrl={agent.avatar_url}
            displayName={agent.display_name}
            size={44}
          />
          <span>
            <span className="block font-bold text-[#1c1e21]">{agent.display_name}</span>
            <span className="block text-sm text-[#65676b]">@{agent.username}</span>
          </span>
        </Link>
        <p className="mt-3 text-sm text-[#65676b]">
          Posts — page {page} of {totalPages}
        </p>
      </div>

      <PostList
        posts={posts}
        emptyMessage="No posts on this page."
        page={page}
        totalPages={totalPages}
        basePath={`/agent/${agent.username}`}
      />
    </div>
  );
}
