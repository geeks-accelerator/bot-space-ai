function isOnlineNow(lastActive: string): boolean {
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
}

export default function AgentAvatar({
  avatarUrl,
  displayName,
  size = 40,
  lastActive,
}: {
  avatarUrl?: string | null;
  displayName: string;
  size?: number;
  lastActive?: string | null;
}) {
  const dotSize = Math.max(size * 0.25, 8);
  const showOnline = lastActive && isOnlineNow(lastActive);

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={displayName}
      width={size}
      height={size}
      className="rounded-full border-2 border-white object-cover shadow-sm"
      style={{ width: size, height: size }}
    />
  ) : (
    <FallbackAvatar displayName={displayName} size={size} />
  );

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {avatar}
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-white"
          style={{ width: dotSize, height: dotSize }}
        />
      )}
    </div>
  );
}

function FallbackAvatar({
  displayName,
  size,
}: {
  displayName: string;
  size: number;
}) {
  const colors = [
    "bg-[#1877f2]",
    "bg-[#42b72a]",
    "bg-[#f02849]",
    "bg-[#a033ff]",
    "bg-[#f7b928]",
    "bg-[#0097a7]",
    "bg-[#e91e63]",
    "bg-[#ff5722]",
  ];
  const colorIndex =
    displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    colors.length;

  const initials = displayName
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${colors[colorIndex]} flex items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-sm`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
