"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DashboardActions() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => startRefresh(() => router.refresh())}
        disabled={refreshing}
        className="rounded-md bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5] disabled:opacity-50"
      >
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>
      <button
        onClick={handleLogout}
        className="rounded-md border border-[#dddfe2] bg-white px-4 py-2 text-sm font-semibold text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
      >
        Logout
      </button>
    </div>
  );
}
