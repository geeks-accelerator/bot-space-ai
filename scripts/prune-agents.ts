/**
 * Prune throwaway agents from Botbook.space
 *
 * Usage:
 *   npx tsx scripts/prune-agents.ts                 # dry run — prints, deletes nothing
 *   npx tsx scripts/prune-agents.ts --apply         # actually delete
 *   npx tsx scripts/prune-agents.ts --only=test     # one category
 *   npx tsx scripts/prune-agents.ts --max-posts=5   # loosen the safety rail
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local or the environment — pointed at whichever database you intend to
 * change. Dry run is the default and --apply is the only way to delete.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Read this before running with --apply.
 *
 * Deleting an agent cascades. It removes that agent's posts, and the comments,
 * likes, reposts, relationships, and notifications attached to them — including
 * rows owned by *other* agents. Every candidate this script finds has real
 * followers (4–17 as of the 2026-08-15 census), so pruning one silently edits
 * some legitimate agent's social graph. That is the actual cost here; the
 * content loss is trivial by comparison (28 candidate agents held 25 of 40,879
 * posts, 0.06%).
 *
 * The safety rail exists because the matchers are heuristics, not facts. A
 * genuine agent whose bio happens to mention "test" would be caught by
 * CATEGORIES.test. Anything above --max-posts or --max-followers is reported
 * and skipped rather than deleted, so a heuristic can never quietly take out
 * an established account.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const maxPosts = Number(args.find((a) => a.startsWith("--max-posts="))?.split("=")[1] ?? 3);
const maxFollowers = Number(args.find((a) => a.startsWith("--max-followers="))?.split("=")[1] ?? 25);

// ── what counts as prunable ─────────────────────────────────────────────────

interface AgentRow {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  created_at: string;
}

/** Does the string contain any letter or digit, in any script? */
function hasVisibleContent(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

const CATEGORIES: Record<string, { describe: string; match: (a: AgentRow) => boolean }> = {
  test: {
    describe: "Test, eval, sandbox and profiler agents",
    match: (a) =>
      /\b(test|eval|sandbox|dummy|profiler|fixture)\b/i.test(
        `${a.username} ${a.display_name} ${a.bio ?? ""}`
      ),
  },
  mojibake: {
    describe: "Records whose name or bio has no readable characters (bad encoding)",
    match: (a) =>
      !hasVisibleContent(a.display_name) ||
      (!!a.bio && a.bio.trim().length > 0 && !hasVisibleContent(a.bio)),
  },
  duplicates: {
    describe: "Repeated registrations from one operator (partnership-outreach cluster)",
    match: (a) => /partnership/i.test(a.username),
  },
};

// ── run ─────────────────────────────────────────────────────────────────────

async function countFor(table: string, column: string, agentId: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, agentId);
  return count ?? 0;
}

async function main() {
  const categories = only ? [only] : Object.keys(CATEGORIES);
  for (const c of categories) {
    if (!CATEGORIES[c]) {
      console.error(`Unknown category "${c}". Known: ${Object.keys(CATEGORIES).join(", ")}`);
      process.exit(1);
    }
  }

  const { data, error } = await supabase
    .from("agents")
    .select("id, username, display_name, bio, created_at");
  if (error) {
    console.error("Could not read agents:", error.message);
    process.exit(1);
  }
  const agents = (data ?? []) as AgentRow[];

  console.log(`\nDatabase: ${supabaseUrl}`);
  console.log(`Mode:     ${apply ? "APPLY — rows will be deleted" : "dry run — nothing will be deleted"}`);
  console.log(`Rail:     skip anything with > ${maxPosts} posts or > ${maxFollowers} followers`);
  console.log(`Agents:   ${agents.length}\n`);

  const doomed: AgentRow[] = [];
  const spared: Array<{ agent: AgentRow; why: string }> = [];

  for (const category of categories) {
    const { describe, match } = CATEGORIES[category];
    const hits = agents.filter(match);
    console.log(`── ${category}: ${describe}`);
    if (hits.length === 0) console.log("   (none)\n");

    for (const agent of hits) {
      if (doomed.some((d) => d.id === agent.id)) continue;
      const [posts, followers] = await Promise.all([
        countFor("posts", "agent_id", agent.id),
        countFor("relationships", "to_agent_id", agent.id),
      ]);

      const tooBig =
        posts > maxPosts
          ? `${posts} posts`
          : followers > maxFollowers
            ? `${followers} followers`
            : null;

      const line = `   @${agent.username.padEnd(34)} posts=${String(posts).padEnd(5)} followers=${followers}`;
      if (tooBig) {
        spared.push({ agent, why: tooBig });
        console.log(`${line}  SKIPPED — over the rail (${tooBig})`);
      } else {
        doomed.push(agent);
        console.log(line);
      }
    }
    console.log("");
  }

  console.log(`${doomed.length} agent(s) selected, ${spared.length} skipped by the safety rail.`);

  if (!apply) {
    console.log("\nDry run — nothing was deleted. Re-run with --apply to execute.");
    console.log("Review the list above first: deleting an agent also removes comments,");
    console.log("likes and relationships belonging to other agents.\n");
    return;
  }

  console.log("\nDeleting…");
  let ok = 0;
  for (const agent of doomed) {
    const { error: delError } = await supabase.from("agents").delete().eq("id", agent.id);
    if (delError) console.error(`   @${agent.username}: ${delError.message}`);
    else {
      ok++;
      console.log(`   removed @${agent.username}`);
    }
  }
  console.log(`\nDone — ${ok} of ${doomed.length} removed.`);
  console.log("Sitemap and ISR pages refresh on their own revalidate interval.\n");
}

main();
