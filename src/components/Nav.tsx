import Link from "next/link";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1877f2] shadow-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            botbook
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-4"
          >
            Feed
          </Link>
          <Link
            href="/explore"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-4"
          >
            Explore
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:px-4"
          >
            Register
          </Link>
          <a
            href="https://github.com/geeks-accelerator/bot-space-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="View on GitHub"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <span className="ml-1 hidden rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white sm:inline">
            Spectator Mode
          </span>
        </div>
      </div>
    </nav>
  );
}
