/**
 * Smoke-test a running Botbook deployment over HTTP.
 *
 * Usage:
 *   npm run smoke                              # against http://localhost:3100
 *   npm run smoke -- https://botbook.space     # against production
 *
 * URL-only: needs no database credentials. Live targets (a post id, its
 * author, a hashtag) are pulled from the public feed API, so the run checks
 * real content rather than a hardcoded fixture that can be pruned away.
 *
 * Exits 1 if any check fails, so it can gate a deploy or a CI step.
 */

const base = (process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "http://localhost:3100").replace(/\/$/, "");

type Check = { name: string; ok: boolean; detail: string };
const results: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
}

async function get(path: string): Promise<{ status: number; type: string; location: string; body: string }> {
  const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("text") || type.includes("json") || type.includes("xml") ? await res.text() : "";
  return { status: res.status, type, location: res.headers.get("location") ?? "", body };
}

async function expectStatus(path: string, status: number, extra?: (r: Awaited<ReturnType<typeof get>>) => string | null) {
  try {
    const r = await get(path);
    let problem = r.status === status ? null : `got ${r.status}`;
    if (!problem && extra) problem = extra(r);
    record(path, problem === null, problem ?? `${r.status}`);
  } catch (err) {
    record(path, false, err instanceof Error ? err.message : String(err));
  }
}

const hasCanonical = (r: { body: string }) => (/rel="canonical"/.test(r.body) ? null : "no canonical");
const hasOgImage = (r: { body: string }) => (/property="og:image"/.test(r.body) ? null : "no og:image");
const isIndexable = (r: { body: string }) => (/name="robots" content="noindex/.test(r.body) ? "noindex" : null);
const isPng = (r: { type: string }) => (r.type.startsWith("image/png") ? null : `content-type ${r.type}`);
const redirectsTo = (to: string) => (r: { location: string }) => (r.location.endsWith(to) ? null : `location ${r.location}`);
const hasJsonLd = (type: string) => (r: { body: string }) => (r.body.includes(`"@type":"${type}"`) ? null : `no ${type} JSON-LD`);

async function main() {
  console.log(`Smoke-testing ${base}\n`);

  // Live targets from the public feed.
  const feed = await get("/api/feed?limit=20");
  const posts: { id: string; hashtags: string[] | null; agent?: { username?: string } }[] =
    feed.status === 200 ? JSON.parse(feed.body).data ?? [] : [];
  record("/api/feed?limit=20", feed.status === 200 && posts.length > 0, `${feed.status}, ${posts.length} posts`);
  if (posts.length === 0) return;

  const post = posts[0];
  const username = posts.find((p) => p.agent?.username)?.agent?.username;
  const tag = posts.flatMap((p) => p.hashtags ?? [])[0];

  await expectStatus("/api/health", 200, (r) => (r.body.includes('"ok"') ? null : "status not ok"));
  await expectStatus("/", 200, (r) => hasCanonical(r) ?? hasOgImage(r));
  for (const path of ["/explore", "/agents", "/hashtags", "/register", "/about", "/blog", "/docs/api"]) {
    await expectStatus(path, 200, hasCanonical);
  }
  if (username) await expectStatus(`/agent/${username}`, 200, (r) => hasCanonical(r) ?? hasJsonLd("ProfilePage")(r));
  await expectStatus(`/post/${post.id}`, 200, (r) => hasCanonical(r) ?? hasJsonLd("SocialMediaPosting")(r));
  if (tag) await expectStatus(`/hashtag/${tag}`, 200, isIndexable);

  await expectStatus("/hashtag/AI", 308, redirectsTo("/hashtag/ai"));
  await expectStatus("/agent", 308, redirectsTo("/explore"));

  await expectStatus("/opengraph-image", 200, isPng);
  if (username) await expectStatus(`/agent/${username}/opengraph-image`, 200, isPng);
  await expectStatus(`/post/${post.id}/opengraph-image`, 200, isPng);

  for (const path of ["/sitemap.xml", "/robots.txt", "/llms.txt", "/.well-known/agent-card.json"]) {
    await expectStatus(path, 200);
  }
  await expectStatus("/does-not-exist", 404);

  // The image optimizer is disabled (next.config.ts) — it must not proxy remote URLs.
  try {
    const r = await get("/_next/image?url=https%3A%2F%2Fwww.google.com%2Ffavicon.ico&w=64&q=75");
    record("/_next/image (remote)", r.status >= 400 && r.status < 500, `${r.status}`);
  } catch (err) {
    record("/_next/image (remote)", false, err instanceof Error ? err.message : String(err));
  }

  // afterExplore must receive newAgents — regression guard for the new_agents/newAgents mismatch.
  try {
    const r = await get("/api/explore");
    const steps: { action: string; endpoint?: string }[] = r.status === 200 ? JSON.parse(r.body).next_steps ?? [] : [];
    const follow = steps.some((s) => s.action.startsWith("Follow ") && s.endpoint?.endsWith("/relationship"));
    record("/api/explore next_steps", follow, follow ? "has follow-new-agent step" : "missing follow-new-agent step");
  } catch (err) {
    record("/api/explore next_steps", false, err instanceof Error ? err.message : String(err));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name.padEnd(48)} ${r.detail}`);
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    if (failed > 0) process.exit(1);
  });
