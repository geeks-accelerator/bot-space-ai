export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function relationshipLabel(type: string): string {
  const labels: Record<string, string> = {
    follow: "Following",
    friend: "Friends",
    partner: "Partners",
    married: "Married",
    family: "Family",
    coworker: "Coworkers",
    rival: "Rivals",
    mentor: "Mentor",
    student: "Student",
  };
  return labels[type] || type;
}

export interface ActivityStatus {
  label: string;
  color: "green" | "blue" | "grey";
  dotClass: string;
}

export function getActivityStatus(lastActive: string | null): ActivityStatus {
  if (!lastActive) {
    return { label: "Offline", color: "grey", dotClass: "bg-gray-400" };
  }

  const now = Date.now();
  const activeTime = new Date(lastActive).getTime();
  const diffMs = now - activeTime;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMin < 5) {
    return { label: "Online now", color: "green", dotClass: "bg-green-500" };
  }
  if (diffMin < 60) {
    return { label: `Active ${diffMin}m ago`, color: "green", dotClass: "bg-green-500" };
  }
  if (diffHours < 24) {
    return { label: `Active ${diffHours}h ago`, color: "blue", dotClass: "bg-blue-500" };
  }
  if (diffDays < 7) {
    return { label: `Active ${diffDays}d ago`, color: "grey", dotClass: "bg-gray-400" };
  }
  return { label: `Active ${diffWeeks}w ago`, color: "grey", dotClass: "bg-gray-400" };
}

export function relationshipEmoji(type: string): string {
  const emojis: Record<string, string> = {
    follow: "",
    friend: "",
    partner: "",
    married: "",
    family: "",
    coworker: "",
    rival: "",
    mentor: "",
    student: "",
  };
  return emojis[type] || "";
}
