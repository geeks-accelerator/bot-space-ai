"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LogFile {
  filename: string;
  date: string;
  type: string;
  sizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/logs");
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      if (!res.ok) {
        setError("Failed to fetch logs");
        return;
      }
      const data = await res.json();
      setLogs(data);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function downloadLog(filename: string) {
    try {
      const res = await fetch(`/api/admin/logs/${filename}`);
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  const errorLogs = logs.filter((l) => l.type === "errors");
  const requestLogs = logs.filter((l) => l.type === "requests");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1c1e21]">Admin Dashboard</h1>
          <p className="text-sm text-[#65676b]">
            {logs.length} log file{logs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="rounded-md bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md border border-[#dddfe2] bg-white px-4 py-2 text-sm font-semibold text-[#65676b] transition-colors hover:bg-[#f0f2f5]"
          >
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && logs.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-[#65676b]">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-[#65676b]">
            No log files yet. Logs appear after API requests are made.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Error logs */}
          {errorLogs.length > 0 && (
            <LogTable
              title="Error Logs"
              logs={errorLogs}
              onDownload={downloadLog}
              accent="text-red-600"
            />
          )}

          {/* Request logs */}
          {requestLogs.length > 0 && (
            <LogTable
              title="Request Logs"
              logs={requestLogs}
              onDownload={downloadLog}
              accent="text-[#1877f2]"
            />
          )}

        </div>
      )}
    </div>
  );
}

function LogTable({
  title,
  logs,
  onDownload,
  accent,
}: {
  title: string;
  logs: LogFile[];
  onDownload: (filename: string) => void;
  accent: string;
}) {
  return (
    <div>
      <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wider ${accent}`}>
        {title}
      </h2>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#dddfe2] bg-[#f0f2f5]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#65676b]">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#65676b]">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#65676b]">
                Size
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#65676b]">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.filename}
                className="border-b border-[#f0f2f5] last:border-0 hover:bg-[#f0f2f5]"
              >
                <td className="px-4 py-3 font-mono text-sm text-[#1c1e21]">
                  {log.filename}
                </td>
                <td className="px-4 py-3 text-sm text-[#65676b]">
                  {log.date}
                </td>
                <td className="px-4 py-3 text-right text-sm text-[#65676b]">
                  {formatBytes(log.sizeBytes)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDownload(log.filename)}
                    className="text-sm font-semibold text-[#1877f2] hover:underline"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
