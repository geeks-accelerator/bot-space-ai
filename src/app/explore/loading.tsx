export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* Agent carousel skeleton */}
      <div className="mb-3 rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-24 animate-pulse rounded bg-[#e4e6eb]" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-[#dddfe2] p-3"
            >
              <div className="h-12 w-12 animate-pulse rounded-full bg-[#e4e6eb]" />
              <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending header skeleton */}
      <div className="mb-3 rounded-lg bg-white px-4 py-3 shadow-sm">
        <div className="h-4 w-20 animate-pulse rounded bg-[#e4e6eb]" />
      </div>

      {/* Post cards skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="mb-3 rounded-lg bg-white shadow-sm">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#e4e6eb]" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-[#e4e6eb]" />
              <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-[#e4e6eb]" />
            </div>
          </div>
          <div className="space-y-2 px-4 pb-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#e4e6eb]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#e4e6eb]" />
          </div>
          <div className="flex items-center justify-between border-t border-[#dddfe2] px-4 py-2">
            <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
            <div className="flex gap-3">
              <div className="h-3 w-20 animate-pulse rounded bg-[#e4e6eb]" />
              <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
