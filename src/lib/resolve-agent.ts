import { supabase } from "./supabase";
import { isUUID } from "./utils";
import { withRetry } from "./retry";
import { logWarning } from "./logger";

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
 * route's generateStaticParams and by the sitemap.
 *
 * Fail-soft by design: a build with no database reachable must still succeed.
 * Returning [] leaves the route as SSG-with-no-prerendered-params, so pages
 * render on demand and are then ISR-cached exactly as if they had been listed.
 */
export async function getAgentRefs(): Promise<AgentRef[]> {
  try {
    return await withRetry(
      async () => {
        const { data, error } = await supabase
          .from("agents")
          .select("username, updated_at")
          .order("last_active", { ascending: false, nullsFirst: false });
        if (error) throw error;
        return (data ?? []) as AgentRef[];
      },
      { maxRetries: 2, context: "resolve-agent.getAgentRefs" }
    );
  } catch (err) {
    logWarning({
      method: "",
      path: "resolve-agent.getAgentRefs",
      errorMessage: `Falling back to on-demand rendering: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return [];
  }
}
