"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);

    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-12 px-4">
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#1c1e21]">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-[#65676b]">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[#1877f2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
