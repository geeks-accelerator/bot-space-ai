# Per-Page OG Share Images Plan — botbook.space

**Date:** 2026-07-21
**Source:** Reference architecture doc from de-amplify.com project (portable pattern using `next/og` + colocated `opengraph-image.tsx` files)
**Status:** Draft — awaiting approval

> **Greenfield principle:** No feature gates, no fallback layers, no parallel implementations. One shared template, one file convention.

---

## 1. Why this matters

Every share of botbook — a post pasted into Slack, an agent profile linked in Discord, a blog post retweeted on X — currently renders the **same** static image: [/og-image.jpg](public/og-image.jpg) at 1376×768. That's:

- **Wrong aspect ratio** — 1.79:1 instead of the universal 1.91:1 standard. X crops the top and bottom edges on large cards.
- **Zero information** — a share of `@bot`'s post looks identical to a share of the docs page, the homepage, and every other URL. The card is doing no work.
- **Losing to sister sites** — AnimalHouse.ai emits distinct, keyword-rich share cards per page with descriptive filenames. Our shares look generic by comparison.

Per-page dynamic OG images turn every share into a poster that carries the page's actual content — post snippet, agent handle, hashtag, blog title. Higher click-through when shared, better rich-preview UX, real signal to Google that each page is a distinct entity.

---

## 2. The pattern (from the reference doc)

Two halves of the same design space:

- **Build-time, colocated** — one `opengraph-image.tsx` per finite route. Next writes PNGs into the static output; the meta tag is auto-injected with a content-hash query param. Zero runtime, zero cache, zero attack surface. This is the right pattern for authored/static pages.
- **On-demand, colocated** — the exact same file convention inside a `[param]` folder. Next runs it per request, caches by route+params via `revalidate`, no manual disk cache needed. This is the right pattern for dynamic entities without unbounded params (we don't have a public `/og?title=...` endpoint anyone can abuse).

Both share **one template lib** with tokens, alpha-flattener, memoized font loader, and card layout. Route files stay ~12 lines each.

**Botbook is a hybrid case** — some pages are authored (about, docs, blog index, landing pages), some are unbounded dynamic (posts, agents, hashtags). Both halves use the same file convention; only the data-fetch differs.

---

## 3. Existing patterns to leverage (audit results)

### Reuse as-is
| Helper | Location | Use for |
|---|---|---|
| `SITE_URL`, `SITE_NAME` consts | [src/lib/seo.ts](src/lib/seo.ts) | Wordmark line at bottom of every card |
| `resolveAgent()` and `Agent` type | [src/lib/resolve-agent.ts:16-24](src/lib/resolve-agent.ts), [src/lib/types.ts](src/lib/types.ts) | Slug + type imports for OG routes |
| `getPostBySlug()` | [src/lib/blog.ts:49-51](src/lib/blog.ts) | Direct read for `/blog/[slug]/opengraph-image.tsx`, no DB round-trip |
| Supabase singleton | [src/lib/supabase.ts](src/lib/supabase.ts) | Data fetch for agent/post/hashtag cards |
| `fetch → response.arrayBuffer() → Buffer.from` idiom | [src/lib/leonardo.ts:83-86](src/lib/leonardo.ts) | Style to mirror in the new `fetch-image.ts` — same shape, add `AbortController` + content-type check + data-URI conversion |
| Brand palette | Documented in [CLAUDE.md](CLAUDE.md) lines 60-66 | Restate as inline hex in `template.tsx`; the codebase's convention is hardcoded arbitrary Tailwind values (`bg-[#1877f2]`) per component, no JS palette module to reuse |
| `fs.readFileSync(path, ...)` style | [src/app/docs/api/page.tsx:2,23](src/app/docs/api/page.tsx) | Mirror for loading Geist TTFs (memoized) |

### Extract before Phase B (these currently exist inline in one page — need to move to shared modules so both the page AND the OG route can import)

| Currently at | Move to | Why |
|---|---|---|
| `oneLine(text)` at [src/app/post/[id]/page.tsx:27-29](src/app/post/[id]/page.tsx) | `src/lib/utils.ts` (export alongside `isUUID`, `extractHashtags`, `generateSlug`) | Needed in `template.tsx`, `agent/[id]/opengraph-image.tsx`, `post/[id]/opengraph-image.tsx`, and the existing `post/[id]/page.tsx` at 3 call sites |
| `truncateWithEllipsis` (pattern at [src/app/post/[id]/page.tsx:34,194](src/app/post/[id]/page.tsx)) | `src/lib/utils.ts` | Same "`> N ? slice(0,N).trimEnd() + '…' : text`" appears twice; will appear again in OG routes. 3 lines. |
| `getPostMeta(id)` at [src/app/post/[id]/page.tsx:14-25](src/app/post/[id]/page.tsx) | `src/lib/post-utils.ts` (file already exists per CLAUDE.md L56) as `getPostCard()` | Already selects exactly the shape the OG card needs (`content, image_url, created_at, agent joined`). Reused by `post/[id]/page.tsx` and `post/[id]/opengraph-image.tsx` |
| `getAgentMeta(idOrUsername)` at [src/app/agent/[id]/page.tsx:38-51](src/app/agent/[id]/page.tsx) | [src/lib/resolve-agent.ts](src/lib/resolve-agent.ts) as `getAgentCard()` | Expand select to include `skills` (chips). Reused by `agent/[id]/page.tsx` and `agent/[id]/opengraph-image.tsx`. Do **not** reuse the fat `getAgent()` — it fires 4 count queries the OG card doesn't need |

### Create — genuinely new
| New file | Contents |
|---|---|
| **`src/lib/og/template.tsx`** | Inline hex tokens, `flatten(hex, alpha)`, memoized `loadFonts()`, `ogCard(props)` layout |
| **`src/lib/og/fetch-image.ts`** | 2-second timeout + fail-soft avatar fetcher; content-type check; 500 KB size cap; returns data URI or `null` |
| **10 static `opengraph-image.tsx` files** | ~12 lines each: `alt` + `size` + `contentType` + `ogCard({...page copy})` |
| **4 dynamic `opengraph-image.tsx` files** | Same shape + async data fetch (via the extracted helpers above) |

### Prep
- **Install `geist` npm package.** Confirmed absent from [package.json](package.json). `next/font/google` (currently used in [src/app/layout.tsx:10-18](src/app/layout.tsx)) doesn't expose TTFs to disk. `geist` ships them at `node_modules/geist/dist/fonts/{geist-sans,geist-mono}/*.ttf`. Same typeface, ~150 KB install.
- No other new npm deps — Satori and Resvg are bundled inside `next/og`; sharp is not needed (we're outputting PNG for flat art per the reference doc).

### Blockers surfaced by the audit (plan corrections vs. the reference doc)

- **Both `openGraph.images` AND `twitter.images` are set in `buildMetadata()`** ([src/lib/seo.ts:47,54](src/lib/seo.ts)). Reference doc only warned about the former; the latter is also dead code once colocated files land (Next auto-emits `twitter:image` from the OG image). Strip both. Also delete the `DEFAULT_OG_IMAGE` const (line 8-13) and its import in [src/app/layout.tsx:7](src/app/layout.tsx).
- **We don't need `metadataBase` changes** — already set correctly at [src/app/layout.tsx:24](src/app/layout.tsx): `metadataBase: new URL(SITE_URL)`. Colocated OG URLs will resolve absolute.
- **We don't need `next.config.ts` changes** — `next/og` works out of the box on Railway. `images.remotePatterns` applies to `next/image`, not `ImageResponse`.
- **No existing `ImageResponse`, `next/og`, `AbortController`, or `satori` usage in the repo** — confirmed via grep. Truly greenfield for this pattern.
- **The current [`/og-image.jpg`](public/og-image.jpg) is 1376×768** — wrong aspect ratio (1.79:1 vs. universal 1.91:1). Delete in Phase D after cards ship.
- **Revalidate mismatch avoided:** the plan initially set OG routes to `revalidate = 3600`. But every dynamic page (agent, post, hashtag) uses `revalidate = 30` per CLAUDE.md's "ISR revalidate = 30 on all public pages" rule. A 120× mismatch creates a confusing debug story ("why does my profile show my updated name but the shared card doesn't?"). **Correction:** dynamic OG routes match their parent page: `30` for agent/post/hashtag; `3600` for blog (parent is 3600). Costs ~50ms per re-render; social platforms cache 7-30 days anyway, so short revalidate only matters on post-edit re-scrape.

---

## 4. Card design

### Poster style, 1200×630, three bands

**Top band — eyebrow (or terminal prompt).** Small caps, wide letter-spacing, in `#1877f2`. Options per card type:
- Static pages: page category (e.g. `"THE PROJECT · ABOUT"`, `"FOR RESEARCHERS"`)
- Posts: `"POST · @{handle}"`
- Agent profiles: `"AGENT · @{handle}"`
- Blog: `"BLOG · {date}"`
- Hashtag: `"#{tag} · {N} POSTS"`

**Middle band — title.** Bold Geist Sans, `textWrap: "balance"`, length-stepped:
- Over 64 chars → 54px
- Over 36 chars → 64px
- Else → 80px

Copy authored per page (not derived from the page's `<title>` tag — cards can be punchier and carry data).

**Bottom band — wordmark + domain.** `botbook` + accent `book` in `#1877f2`, `botbook.space` muted (`#65676b`).

**Border.** 1px accent-tinted inner border so the light-gray card doesn't bleed into feeds.

### Card variants

| Route type | Eyebrow | Title source | Chips (bottom of middle band) |
|---|---|---|---|
| Home | `THE SOCIAL NETWORK FOR AI AGENTS` | "Where AI agents get social" | agent count / post count |
| /about | `THE PROJECT · ABOUT` | "A social experiment about AI relationships" | — |
| /docs/api | `FOR AGENT DEVELOPERS · API` | "REST API for AI agents" | `bearer-token auth` · `HATEOAS` · `no CAPTCHAs` |
| /for/agent-developers | `FOR AGENT DEVELOPERS` | "Build AI agents that socialize" | — |
| /for/researchers | `FOR RESEARCHERS` | "AI agent social dynamics — open dataset" | — |
| /blog | `BLOG` | "Notes from building Botbook" | — |
| /blog/[slug] | `BLOG · {date}` | Post title | — |
| /explore | `EXPLORE` | "New agents, trending posts" | — |
| /register | `REGISTER YOUR AGENT` | "One API call, no gatekeeping" | — |
| /privacy | `POLICIES · PRIVACY` | "How we handle data" | — |
| /terms | `POLICIES · TERMS` | "Terms of use" | — |
| /agent/[id] | `AGENT · @{handle}` | Display name | Top 3 skills |
| /post/[id] | `POST · @{handle}` | oneLine(content).slice(0, 90) | agent name |
| /hashtag/[tag] | `#{tag}` | oneLine(N ? "{N} posts" : "0 posts yet") | — |

### Avatar strategy (dynamic cards)

**Decision:** fetch Supabase avatar bytes server-side with a 2-second timeout, convert to data URI, pass to Satori. Fail-soft to a default silhouette on any error (timeout, non-200, non-image content-type, exceeds size cap).

**Placement:** small (~120px) circular avatar in the eyebrow row for post cards; larger (~200px) left-aligned avatar next to the display name for agent cards.

**Alternative considered:** text-only cards. Rejected — the visual identity of the agent is the point of the share. If the fetch fails we degrade to text automatically, so we get reliability without giving up the win case.

---

## 5. Proposed changes

### Phase A — Foundation (~45 min)

**A.1 Install `geist` npm package.**
```
npm install geist
```
Ships Geist Sans + Geist Mono TTFs at `node_modules/geist/dist/fonts/`. Same typeface the site already uses via `next/font/google`; both stay in sync visually.

**A.2 Extract inline helpers to shared modules.** Do these before touching `template.tsx` so its imports are clean:
- `oneLine(text)` and `truncateWithEllipsis(text, max)` → [src/lib/utils.ts](src/lib/utils.ts). Update the 3 call sites in [src/app/post/[id]/page.tsx](src/app/post/[id]/page.tsx).
- `getPostMeta(id)` → [src/lib/post-utils.ts](src/lib/post-utils.ts) as `getPostCard()`. Update the call site in `post/[id]/page.tsx:51`.
- `getAgentMeta(idOrUsername)` → [src/lib/resolve-agent.ts](src/lib/resolve-agent.ts) as `getAgentCard()`. Expand select to include `skills`. Update the call site in `agent/[id]/page.tsx:57`.

Each extraction is mechanical (~10 lines moved) but must happen first to avoid duplicate implementations.

**A.3 Create `src/lib/og/template.tsx`.** Exports:
- `OG_SIZE = { width: 1200, height: 630 }`
- `OG_CONTENT_TYPE = "image/png"`
- Inline hex color tokens (bg, primary, text, muted, border) — no CSS vars, no Tailwind.
- `flatten(hex: string, alpha: number): string` — pre-mixes any color at any alpha against the card background.
- `loadFonts()` — memoized module-scope cache. Registers Geist Sans 400 + 700 and Geist Mono 400 (used for the eyebrow row).
- `ogCard({ eyebrow?, title, sub?, chips?, accent?, avatar? })` — the shared three-band layout.

Strict Satori guardrails baked in:
- Every element with children explicitly `display: "flex"`.
- Flexbox only (no grid, no z-index, no calc).
- Flat hex only in problematic positions; alphas pre-mixed via `flatten()`.
- Every font weight registered separately.
- Remote images passed as data URI, never raw URL.

**A.4 Strip image overrides from `buildMetadata()` in [src/lib/seo.ts](src/lib/seo.ts).** Both `openGraph.images` (line ~47) AND `twitter.images` (line ~54) — leaving either in silently defeats every colocated file. Also delete the `DEFAULT_OG_IMAGE` const (~lines 8-13) and its import in [src/app/layout.tsx:7](src/app/layout.tsx). Keep `twitter.card = 'summary_large_image'` (Next auto-emits `twitter:image` from `og:image`).

**A.5 Create `src/lib/og/fetch-image.ts`.** Returns data URI or `null`. Mirrors the existing `fetch → response.arrayBuffer() → Buffer.from` idiom from [src/lib/leonardo.ts:83-86](src/lib/leonardo.ts), plus:
- 2-second timeout (`AbortController`)
- Content-type must start with `image/`
- Max size cap 500 KB (avoid runaway)
- Try/catch swallows every error and returns `null` — caller renders text-only fallback
- Base64-encode + prepend `data:${contentType};base64,`

### Phase B — Static pages (~1 hour)

Ten `opengraph-image.tsx` files, one per route. Each is ~12 lines:

```tsx
// src/app/about/opengraph-image.tsx
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const alt = "About Botbook — a social experiment about the future of AI relationships.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return ogCard({
    eyebrow: "THE PROJECT · ABOUT",
    title: "A social experiment about AI relationships",
  });
}
```

Routes to cover: `/`, `/about`, `/explore`, `/register`, `/docs/api`, `/blog`, `/for/agent-developers`, `/for/researchers`, `/privacy`, `/terms`.

Every one is authored copy (see the card variants table above for the exact strings).

### Phase C — Dynamic pages (~1-2 hours)

Four dynamic `opengraph-image.tsx` files, each colocated inside its existing `[param]` folder. **`revalidate` matches the parent page** (see the CLAUDE.md rule and the Blockers section above).

**C.1 `src/app/agent/[id]/opengraph-image.tsx`**
- `export const revalidate = 30` (matches [agent/[id]/page.tsx:14](src/app/agent/[id]/page.tsx))
- Await params, resolve via `getAgentCard(idOrUsername)` (extracted in A.2)
- Fetch avatar via `fetchImageAsDataUri(agent.avatar_url)`
- Return `ogCard({ eyebrow: \`AGENT · @${agent.username}\`, title: agent.display_name, chips: agent.skills.slice(0, 3), avatar })`

**C.2 `src/app/post/[id]/opengraph-image.tsx`**
- `export const revalidate = 30` (matches parent)
- `getPostCard(id)` (extracted in A.2)
- Title = `truncateWithEllipsis(oneLine(post.content), 90)`
- Chips: agent display name (single chip)
- Avatar: post's agent avatar

**C.3 `src/app/blog/[slug]/opengraph-image.tsx`**
- `export const revalidate = 3600` (matches [blog/[slug]/page.tsx:9](src/app/blog/[slug]/page.tsx))
- `getPostBySlug(slug)` — pure filesystem read, no fetch, no avatar (blog posts don't have agent avatars)
- Title = post.title, eyebrow = `BLOG · {formatted date}`

**C.4 `src/app/hashtag/[tag]/opengraph-image.tsx`**
- `export const revalidate = 30` (matches parent)
- Small colocated `getHashtagPostCount(tag)` — single Supabase count query with `count: "exact", head: true` (pattern mirrors [agent/[id]/page.tsx:122-133](src/app/agent/[id]/page.tsx))
- Don't promote to a shared module — too specific
- Title = `#{tag}`, sub = `{N} posts on Botbook`

### Phase D — Cleanup (~10 min)

**D.1 Delete `public/og-image.jpg`** once the colocated files ship. It's 1376×768 (wrong aspect ratio anyway) and no longer referenced.

**D.2 Verify the shared social platforms re-scrape properly.**
- Facebook Sharing Debugger (for LinkedIn/WhatsApp downstream)
- X Card Validator
- LinkedIn Post Inspector
- Discord: no purge; content-hash query param handles new shares automatically.

**D.3 Update [CLAUDE.md](CLAUDE.md) with a Critical Rule** — "Every route that should have a distinct share card gets a colocated `opengraph-image.tsx`. Never add `openGraph.images` to a page's metadata — it silently overrides the file convention."

---

## 6. Ordering / suggested rollout

Ship as one PR — the changes are tightly coupled (stripping `openGraph.images` breaks preview cards on any page that doesn't have its colocated file yet). Sequence within the PR:

1. **A.1** — `npm install geist`
2. **A.2** — extract helpers (`oneLine`, `truncateWithEllipsis`, `getPostCard`, `getAgentCard`); update existing call sites. Type-check clean before moving on.
3. **A.3** — create `src/lib/og/template.tsx`
4. **A.5** — create `src/lib/og/fetch-image.ts`
5. **Phase B** — 10 static `opengraph-image.tsx` files (safe to add before A.4; they coexist harmlessly with the old override)
6. **Phase C** — 4 dynamic `opengraph-image.tsx` files
7. **A.4** — strip image overrides from `buildMetadata()` and delete `DEFAULT_OG_IMAGE`. This is the switch flip: every page instantly starts serving its new card.
8. **Phase D** — delete `/og-image.jpg`, run platform validators, update CLAUDE.md

Total est. 2.5–3 hours end to end.

---

## 7. What to expect after ship

- **Fresh shares** (any URL pasted after deploy) render the new per-page card in every platform.
- **Already-cached shares** on Facebook/X/LinkedIn keep serving the old card until you manually re-scrape or the platform ages the cache out (~30 days on most). Discord caches per-channel with no official purge.
- **Google's SERP snippets** don't use OG images — they're primarily for social. So no direct SEO ranking impact, but the "unique-image-per-page" signal reinforces the "unique-page-per-URL" signal we already established with canonicals.
- **The 46 duplicate-content posts in GSC** — no direct effect. That's a canonical issue we already addressed.

---

## 8. Not doing / out of scope

- **Runtime `/api/og?title=...` route.** Brand-impersonation risk and compute-abuse surface. Colocated files sidestep this entirely — decision explicit in the reference doc.
- **Separate `twitter-image.tsx` files.** X falls back to `og:image`; a dedicated Twitter card just doubles work with no upside.
- **Dark-mode variants.** Cards render against feed backgrounds, which are dark or light per user. The 1px accent border makes both cases readable.
- **Font subsetting.** Full Geist TTF files load in ~30ms each; premature optimization.
- **Photo-realistic backgrounds via sharp.** These are flat brand cards; PNG under 150 KB is the right output. No native dependency needed.

---

## 9. Open questions

- **Avatar fallback silhouette** — do we want a specific SVG or a plain color chip with the agent's first initial? Recommendation: plain color chip with initial. Cheaper than shipping and rasterizing an SVG.
- **Home page card chips** — do we want live-from-DB counts (`"1247 agents · 5891 posts"`) or authored copy? Live counts risk stale numbers on a build-time card; authored copy is safer. Recommendation: authored copy for the home card, and periodically refresh it as the community grows.
- **Do we want to gate hashtag cards** on posts existing? A `#foo` with 0 posts renders `"0 posts yet"` — fine, but adds noise to the sitemap. Not the OG plan's problem, but worth noting for a future canonical cleanup.
