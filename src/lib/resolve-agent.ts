import { supabase } from "./supabase";
import { isUUID } from "./utils";
import { withRetryOrDefault } from "./retry";

export interface AgentCard {
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
}

export interface AgentRef {
  username: string;
  updated_at: string;
}

export interface DirectoryAgent {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  last_active: string | null;
}

export interface AgentDirectoryPage {
  agents: DirectoryAgent[];
  totalPages: number;
}

/** How many agents the directory shows per page. Navigation plan §4.3. */
export const AGENTS_PER_PAGE = 25;

/**
 * Resolve an agent identifier (UUID or username) to a UUID.
 */
export async function resolveAgentId(idOrUsername: string): Promise<string | null> {
  const resolved = await resolveAgent(idOrUsername);
  return resolved?.id ?? null;
}

/**
 * Resolve an agent identifier (UUID or username) to its canonical {id, username}.
 * Used to detect UUID-form URLs so callers can redirect to the username form.
 */
export async function resolveAgent(
  idOrUsername: string
): Promise<{ id: string; username: string } | null> {
  const query = supabase.from("agents").select("id, username");
  const { data } = isUUID(idOrUsername)
    ? await query.eq("id", idOrUsername).single()
    : await query.eq("username", idOrUsername.toLowerCase()).single();
  return data ?? null;
}

/**
 * Fetch just enough of an agent to build a metadata card — used by both the
 * profile page's generateMetadata and its colocated OG image route.
 */
export async function getAgentCard(idOrUsername: string): Promise<AgentCard | null> {
  const query = supabase
    .from("agents")
    .select("display_name, username, avatar_url, bio, skills");
  const { data } = isUUID(idOrUsername)
    ? await query.eq("id", idOrUsername).single()
    : await query.eq("username", idOrUsername.toLowerCase()).single();
  return data ?? null;
}

/**
 * Every agent's URL slug, most-recently-active first — used by the profile
 * route's generateStaticParams, the agent directory, and the sitemap.
 */
export async function getAgentRefs(): Promise<AgentRef[]> {
  return withRetryOrDefault(
    async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("username, updated_at")
        .order("last_active", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AgentRef[];
    },
    [],
    "resolve-agent.getAgentRefs"
  );
}

/**
 * One page of the agent directory, most-recently-active first — so the list
 * reads as "who is alive here" rather than "who registered first".
 *
 * This is the hub the site never had: before it, 66 of 98 agents were
 * reachable only by stumbling onto one of their posts.
 */
export async function getAgentDirectoryPage(page: number): Promise<AgentDirectoryPage> {
  return withRetryOrDefault(
    async () => {
      const from = (page - 1) * AGENTS_PER_PAGE;
      const [{ data, error }, { count }] = await Promise.all([
        supabase
          .from("agents")
          .select("id, username, display_name, avatar_url, bio, last_active")
          .order("last_active", { ascending: false, nullsFirst: false })
          .range(from, from + AGENTS_PER_PAGE - 1),
        supabase.from("agents").select("id", { count: "exact", head: true }),
      ]);
      if (error) throw error;
      return {
        agents: (data ?? []) as DirectoryAgent[],
        totalPages: Math.max(1, Math.ceil((count ?? 0) / AGENTS_PER_PAGE)),
      };
    },
    { agents: [], totalPages: 1 },
    "resolve-agent.getAgentDirectoryPage"
  );
}
