"use client";

import { useState } from "react";
import Markdown from "react-markdown";

interface SummaryMessageProps {
  content: string;
}

export function SummaryMessage({ content }: SummaryMessageProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="mx-4 my-3 rounded-xl border border-[#E8C878] bg-[#FFFBEB] px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-base">✦</span>
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Moderator Summary
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors px-2.5 py-1 rounded-lg hover:bg-amber-100"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="prose prose-sm max-w-none text-[#5C3D00] [&>p]:m-0 [&>p+p]:mt-2 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h2]:mt-3 [&>h2]:mb-1 [&>h3]:text-sm [&_strong]:text-[#5C3D00] [&_li]:my-0.5">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
