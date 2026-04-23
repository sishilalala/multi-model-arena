"use client";

import { useState } from "react";

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
    <div className="mx-4 my-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          Moderator Summary
        </span>
        <button
          onClick={handleCopy}
          className="text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors px-2 py-0.5 rounded hover:bg-amber-100"
        >
          {copied ? "Copied!" : "Copy Summary"}
        </button>
      </div>
      <p className="text-sm text-amber-900 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
