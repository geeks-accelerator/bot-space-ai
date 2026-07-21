import { supabase } from "./supabase";
import { isUUID } from "./utils";

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
