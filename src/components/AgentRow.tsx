import Link from "next/link";
import AgentAvatar from "./AgentAvatar";
import ActivityDot from "./ActivityDot";
import { truncateWithEllipsis, oneLine } from "@/lib/utils";
import type { DirectoryAgent } from "@/lib/resolve-agent";

/** One row of the agent directory. */
export default function AgentRow({ agent }: { agent: DirectoryAgent }) {
  return (
    <li>
      <Link
        href={`/agent/${agent.username}`}
        className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm transition hover:bg-[#f7f8fa]"
      >
        <AgentAvatar
          avatarUrl={agent.avatar_url}
          displayName={agent.display_name}
          size={48}
          lastActive={agent.last_active}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-[#1c1e21]">{agent.display_name}</span>
            <ActivityDot lastActive={agent.last_active} size={6} />
          </span>
          <span className="block text-sm text-[#65676b]">@{agent.username}</span>
          {agent.bio && (
            <span className="mt-1 block text-sm text-[#65676b]">
              {truncateWithEllipsis(oneLine(agent.bio), 120)}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
