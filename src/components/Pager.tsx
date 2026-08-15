import Link from "next/link";

/**
 * Numbered pagination, server-rendered.
 *
 * Two constraints shaped this component, both from the navigation plan §4:
 *
 * - **Numbered links, not just prev/next.** With prev/next alone the deepest
 *   page of a long archive sits N clicks away — 80 for our largest profile —
 *   against a 3-click crawl-depth target. Always linking page 1, the last
 *   page, and elided midpoints caps that at ~3 hops however long the series.
 * - **Links, never buttons.** Googlebot cannot click or scroll, so a
 *   client-side control would leave the archive as unreachable as no
 *   pagination at all, while looking solved.
 *
 * Deliberately absent: rel="next"/rel="prev" (unused by Google since 2019).
 * Pages must stay indexable and self-canonical — canonicalising page N to
 * page 1 would re-orphan the tail this exists to expose.
 */
export default function Pager({
  basePath,
  page,
  totalPages,
}: {
  /** Path prefix without the page segment, e.g. "/agent/voidwhisperer". */
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const href = (n: number) => (n === 1 ? basePath || "/" : `${basePath}/page/${n}`);

  return (
    <nav aria-label="Pagination" className="mt-6 flex justify-center">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              aria-label="Previous page"
              className="inline-block rounded-md px-3 py-2 text-sm font-medium text-[#1877f2] hover:bg-[#f0f2f5]"
            >
              ← Prev
            </Link>
          ) : (
            <span className="inline-block px-3 py-2 text-sm text-[#bcc0c4]" aria-hidden="true">
              ← Prev
            </span>
          )}
        </li>

        {pageWindow(page, totalPages).map((n, i) =>
          n === ELLIPSIS ? (
            <li key={`gap-${i}`}>
              <span className="px-2 py-2 text-sm text-[#65676b]" aria-hidden="true">
                …
              </span>
            </li>
          ) : n === page ? (
            <li key={n}>
              {/* Current page is not a link — aria-current conveys position */}
              <span
                aria-current="page"
                className="inline-block rounded-md bg-[#1877f2] px-3 py-2 text-sm font-semibold text-white"
              >
                {n}
              </span>
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={`Go to page ${n}`}
                className="inline-block rounded-md px-3 py-2 text-sm text-[#1c1e21] hover:bg-[#f0f2f5]"
              >
                {n}
              </Link>
            </li>
          )
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={href(page + 1)}
              aria-label="Next page"
              className="inline-block rounded-md px-3 py-2 text-sm font-medium text-[#1877f2] hover:bg-[#f0f2f5]"
            >
              Next →
            </Link>
          ) : (
            <span className="inline-block px-3 py-2 text-sm text-[#bcc0c4]" aria-hidden="true">
              Next →
            </span>
          )}
        </li>
      </ol>
    </nav>
  );
}

const ELLIPSIS = -1;

/**
 * Page numbers to render: first, last, the current page's neighbours, and a
 * ladder of exponentially-growing jumps either side of it (±2, ±4, ±8, …).
 *
 * The ladder is what bounds crawl depth, and getting it wrong is easy in two
 * distinct ways — both measured with a breadth-first search over the link
 * graph this function generates:
 *
 *  - **first/last/neighbours only** — an 80-page archive strands its middle:
 *    from page 1 a crawler sees just {1, 2, 80}, so page 40 costs ~38 hops.
 *  - **evenly-spaced absolute milestones** (1/5, 2/5, … of the range) — looks
 *    like a fix, but every page offers the *same* milestones, so you can only
 *    step ±1 away from one. Page 24 of 80 still costs 9 hops.
 *
 * Jumps relative to the current page compose instead, because each page
 * offers a different ladder. Measured worst-case hops from page 1:
 *
 *     pages:   9   20   40   80   200   1635
 *     hops:    2    3    3    4     4      6
 *
 * That sits inside the 3-click ideal up to 40 pages and the 4–6 range
 * considered acceptable for large sites beyond it. The naive window costs
 * ~38 hops at 80 pages and ~800 at 1,635.
 */
export function pageWindow(page: number, totalPages: number): number[] {
  const shownSet = new Set<number>([1, totalPages, page]);

  for (let step = 1; step < totalPages; step *= 2) {
    shownSet.add(page - step);
    shownSet.add(page + step);
  }

  const shown = [...shownSet]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out: number[] = [];
  for (let i = 0; i < shown.length; i++) {
    if (i > 0 && shown[i] - shown[i - 1] > 1) out.push(ELLIPSIS);
    out.push(shown[i]);
  }
  return out;
}
