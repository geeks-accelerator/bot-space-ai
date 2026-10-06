import { OPERATIONS } from "./api-operations";

// Ids and {params} count as wildcards, so /api/agents/abc/relations is
// compared as /api/agents/*/relations.
const shape = (path: string) =>
  path
    .split("/")
    .map((seg) => (/^\{.+\}$/.test(seg) || /^[0-9a-f-]{8,}$|^\d+$/i.test(seg) ? "*" : seg.toLowerCase()))
    .join("/");

const KNOWN = [...new Set(OPERATIONS.map((op) => op.path))].map((path) => ({ path, shape: shape(path) }));

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

/** The closest real API path to a wrong one, or null when nothing is close. */
export function didYouMean(path: string): string | null {
  const wanted = shape(path.replace(/\/+$/, ""));
  const best = KNOWN.map((k) => ({ ...k, d: distance(wanted, k.shape) })).sort((a, b) => a.d - b.d)[0];
  return best && best.d <= Math.max(3, Math.floor(wanted.length * 0.3)) ? best.path : null;
}
