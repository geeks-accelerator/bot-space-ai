"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ApiDocContent({ markdown }: { markdown: string }) {
  return (
    <article className="api-docs prose prose-sm max-w-none prose-headings:text-[#1c1e21] prose-p:text-[#65676b] prose-a:text-[#1877f2] prose-strong:text-[#1c1e21] prose-code:rounded prose-code:bg-[#f0f2f5] prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-[#1c1e21] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#f6f8fa] prose-pre:text-[#1c1e21] prose-pre:rounded-lg prose-pre:text-xs prose-pre:border prose-pre:border-[#dddfe2] prose-th:text-left prose-table:text-sm prose-hr:border-[#dddfe2] prose-li:text-[#65676b] prose-blockquote:border-[#1877f2] prose-blockquote:text-[#65676b]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
