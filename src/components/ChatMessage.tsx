"use client";

import React from "react";
import { getModelInfo } from "@/lib/models";

interface ChatMessageProps {
  role: "user" | "model";
  modelId?: string;
  content: string;
  /** Cost in USD */
  cost?: number;
  error?: boolean;
  streaming?: boolean;
  onRetry?: () => void;
}

export function ChatMessage({
  role,
  modelId,
  content,
  cost,
  error = false,
  streaming = false,
  onRetry,
}: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-[#C96A2E] text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  // Model message
  const model = modelId ? getModelInfo(modelId) : null;

  if (error) {
    return (
      <div className="flex justify-start px-4 py-1">
        <div className="max-w-[70%]">
          {model && (
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: model.color }}
              />
              <span className="text-xs font-medium text-[#8B7E74]">{model.name}</span>
            </div>
          )}
          <div className="rounded-2xl rounded-tl-sm border border-[#E8E0D8] bg-[#F5F0EB] px-4 py-2.5 text-sm">
            <span className="text-[#B0A49A] italic">did not respond</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-3 text-[#C96A2E] hover:text-[#A05020] font-medium not-italic text-xs underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-4 py-1">
      <div className="max-w-[70%]">
        {model && (
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: model.color }}
            />
            <span className="text-xs font-medium" style={{ color: model.color }}>
              {model.name}
            </span>
            {cost != null && cost > 0 && (
              <span className="text-xs text-[#B0A49A] ml-1">
                ${cost.toFixed(4)}
              </span>
            )}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm border border-[#E8E0D8] bg-white px-4 py-2.5 text-sm text-[#2C2420] whitespace-pre-wrap leading-relaxed shadow-sm">
          {content}
          {streaming && (
            <span className="inline-block w-0.5 h-4 bg-[#C96A2E] ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
