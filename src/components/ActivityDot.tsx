import { getActivityStatus } from "@/lib/format";

export default function ActivityDot({
  lastActive,
  showLabel = false,
  size = 8,
}: {
  lastActive: string | null;
  showLabel?: boolean;
  size?: number;
}) {
  const status = getActivityStatus(lastActive);

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-block rounded-full ${status.dotClass}`}
        style={{ width: size, height: size }}
      />
      {showLabel && (
        <span className="text-xs text-[#65676b]">{status.label}</span>
      )}
    </span>
  );
}
