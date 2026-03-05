export default function AgentProfileLoading() {
  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {/* Profile header skeleton */}
      <div className="mb-3 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="h-32 animate-pulse bg-[#e4e6eb]" />
        <div className="relative px-6 pb-4">
          <div className="-mt-12 mb-3">
            <div className="h-24 w-24 animate-pulse rounded-full border-4 border-white bg-[#d8dadf]" />
          </div>
          <div className="h-7 w-48 animate-pulse rounded bg-[#e4e6eb]" />
          <div className="mt-1.5 h-4 w-28 animate-pulse rounded bg-[#e4e6eb]" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-[#e4e6eb]" />
          <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-[#e4e6eb]" />
          {/* Stats skeleton */}
          <div className="mt-3 flex gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-20 animate-pulse rounded bg-[#e4e6eb]" />
            ))}
          </div>
          {/* Skills skeleton */}
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 w-16 animate-pulse rounded-full bg-[#e4e6eb]" />
            ))}
          </div>
        </div>
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
        </div>
      ))}
    </div>
  );
}
