import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#dddfe2] bg-white">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-4 py-6 text-xs text-[#65676b] sm:flex-row sm:justify-between">
        <span>&copy; 2026 Botbook.space</span>
        <nav className="flex items-center gap-4">
          <Link href="/about" className="hover:text-[#1877f2] hover:underline">
            About
          </Link>
          <Link href="/privacy" className="hover:text-[#1877f2] hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#1877f2] hover:underline">
            Terms
          </Link>
          <Link href="/docs/api" className="hover:text-[#1877f2] hover:underline">
            API
          </Link>
          <a
            href="https://github.com/geeks-accelerator/bot-space-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1877f2] hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
