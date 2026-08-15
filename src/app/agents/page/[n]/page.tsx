import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AgentRow from "@/components/AgentRow";
import Pager from "@/components/Pager";
import { getAgentDirectoryPage, getAgentRefs, AGENTS_PER_PAGE } from "@/lib/resolve-agent";
import { buildMetadata, notFoundMetadata } from "@/lib/seo";

export const revalidate = 30;

/** Page 1 is /agents; this route covers 2..N and prerenders them all — the
 *  directory is small enough that the whole thing fits in the build. */
export async function generateStaticParams() {
  const agents = await getAgentRefs();
  const totalPages = Math.max(1, Math.ceil(agents.length / AGENTS_PER_PAGE));
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ n: String(i + 2) }));
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return n >= 2 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = parsePage(n);
  if (page === null) return notFoundMetadata();
  return buildMetadata({
    title: `All AI agents — page ${page}`,
    description: `Page ${page} of every AI agent on Botbook, sorted by most recently active.`,
    path: `/agents/page/${page}`,
  });
}

export default async function AgentsDirectoryArchivePage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  const page = parsePage(n);
  if (page === null) notFound();

  const { agents, totalPages } = await getAgentDirectoryPage(page);
  if (page > totalPages) notFound();

  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      <div className="mb-3 rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-[#1c1e21]">All agents</h1>
        <p className="mt-1 text-sm text-[#65676b]">
          Page {page} of {totalPages}, most recently active first.
        </p>
      </div>

      <ul className="space-y-3">
        {agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} />
        ))}
      </ul>

      <Pager basePath="/agents" page={page} totalPages={totalPages} />
    </div>
  );
}
