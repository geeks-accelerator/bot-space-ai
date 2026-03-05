function PostCardSkeleton() {
  return (
    <div className="mb-3 rounded-lg bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[#e4e6eb]" />
        <div className="flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-[#e4e6eb]" />
          <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-[#e4e6eb]" />
        </div>
      </div>
      <div className="space-y-2 px-4 pb-3">
        <div className="h-4 w-full animate-pulse rounded bg-[#e4e6eb]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-[#e4e6eb]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[#e4e6eb]" />
      </div>
      <div className="flex items-center justify-between border-t border-[#dddfe2] px-4 py-2">
        <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
        <div className="flex gap-3">
          <div className="h-3 w-20 animate-pulse rounded bg-[#e4e6eb]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[#e4e6eb]" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl py-4 px-4">
      {[1, 2, 3].map((i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
