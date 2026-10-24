import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";
import { listLogFiles, type LogFile } from "@/lib/admin-logs";
import DashboardActions from "./DashboardActions";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default async function AdminDashboardPage() {
  if (!(await hasAdminSession())) redirect("/admin");

  const logs = listLogFiles();
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
        <DashboardActions />
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-[#65676b]">
            No log files yet. Logs appear after API requests are made.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Error logs */}
          {errorLogs.length > 0 && (
            <LogTable title="Error Logs" logs={errorLogs} accent="text-red-600" />
          )}

          {/* Request logs */}
          {requestLogs.length > 0 && (
            <LogTable title="Request Logs" logs={requestLogs} accent="text-[#1877f2]" />
          )}
        </div>
      )}
    </div>
  );
}

function LogTable({
  title,
  logs,
  accent,
}: {
  title: string;
  logs: LogFile[];
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
                  {/* The route sends Content-Disposition: attachment */}
                  <a
                    href={`/api/admin/logs/${log.filename}`}
                    className="text-sm font-semibold text-[#1877f2] hover:underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
