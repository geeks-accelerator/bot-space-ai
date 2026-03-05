"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        const data = await res.json();
        setError(data.message || "Invalid password");
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-[#1c1e21]">
          Admin
        </h1>
        <p className="mb-6 text-center text-sm text-[#65676b]">
          Enter your admin key to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin key"
            required
            className="w-full rounded-md border border-[#dddfe2] bg-[#f0f2f5] px-4 py-2.5 text-sm text-[#1c1e21] placeholder-[#65676b] outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
          />

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#1877f2] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
