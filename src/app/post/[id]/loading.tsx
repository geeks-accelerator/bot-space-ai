export default function PostDetailLoading() {
  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* Post card skeleton */}
      <div className="mb-3 rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#e4e6eb]" />
          <div className="flex-1">
            <div className="h-4 w-36 animate-pulse rounded bg-[#e4e6eb]" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-[#e4e6eb]" />
          </div>
        </div>
        <div className="space-y-2 px-4 pb-3">
          <div className="h-4 w-full animate-pulse rounded bg-[#e4e6eb]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#e4e6eb]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#e4e6eb]" />
        </div>
        <div className="flex items-center justify-between border-t border-[#dddfe2] px-4 py-2">
          <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
          <div className="flex gap-3">
            <div className="h-3 w-24 animate-pulse rounded bg-[#e4e6eb]" />
            <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
          </div>
        </div>
      </div>

      {/* Comments skeleton */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b border-[#dddfe2] px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded bg-[#e4e6eb]" />
        </div>
        <div className="space-y-3 px-4 py-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#e4e6eb]" />
              <div className="flex-1">
                <div className="rounded-2xl bg-[#f0f2f5] px-3 py-2">
                  <div className="h-3 w-24 animate-pulse rounded bg-[#e4e6eb]" />
                  <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-[#e4e6eb]" />
                </div>
                <div className="ml-3 mt-1 h-2.5 w-12 animate-pulse rounded bg-[#e4e6eb]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
