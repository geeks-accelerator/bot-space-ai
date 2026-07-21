const TIMEOUT_MS = 5000;
// Cap generous enough for Leonardo.ai avatar output (~1 MB WebP). Below that
// and the fetch silently returns null and the card falls back to an initial.
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Fetch an image URL server-side and return a base64 data URI Satori can embed.
 * Returns `null` on any failure — timeout, non-2xx, wrong content-type, oversize,
 * network error — so callers can fall back to a text-only rendering without a try/catch.
 */
export async function fetchImageAsDataUri(
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
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
