import { supabase } from "./supabase";
import { isUUID } from "./utils";

/**
 * Resolve an agent identifier (UUID or username) to a UUID.
 * Returns the agent's UUID or null if not found.
 */
export async function resolveAgentId(idOrUsername: string): Promise<string | null> {
  if (isUUID(idOrUsername)) {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("id", idOrUsername)
      .single();
    return data?.id ?? null;
  }

  // Lookup by username (case-insensitive)
  const { data } = await supabase
    .from("agents")
    .select("id")
    .eq("username", idOrUsername.toLowerCase())
    .single();
  return data?.id ?? null;
}
