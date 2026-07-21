const TIMEOUT_MS = 5000;
// Safe headroom above a 200×200 Supabase-rendered thumbnail (~50 KB). Much
// bigger and Satori risks OOM/timeout when embedding + rasterizing.
const MAX_BYTES = 800 * 1024;

/**
 * Convert a Supabase Storage `object/public` URL to its on-the-fly image
 * transform equivalent, resized to a fixed thumbnail. Pass-through for any
 * other URL. Keeps the payload Satori has to embed well under 100 KB and
 * dodges the memory/latency cliff on original 1 MB Leonardo.ai WebP files.
 */
function toThumbnailUrl(url: string): string {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const rendered =
    url.slice(0, idx) +
    "/storage/v1/render/image/public/" +
    url.slice(idx + marker.length);
  const sep = rendered.includes("?") ? "&" : "?";
  return `${rendered}${sep}width=200&height=200&resize=cover&quality=80`;
}

/**
 * Fetch an image URL server-side and return a base64 data URI Satori can embed.
 * Returns `null` on any failure — timeout, non-2xx, wrong content-type, oversize,
 * network error — so callers can fall back to a text-only rendering without a try/catch.
 */
export async function fetchImageAsDataUri(
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null;
  const target = toThumbnailUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, { signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
