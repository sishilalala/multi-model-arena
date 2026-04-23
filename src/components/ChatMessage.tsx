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
}

export function ChatMessage({
  role,
  modelId,
  content,
  cost,
  error = false,
  streaming = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-blue-600 text-white px-4 py-2.5 text-sm">
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
              <span className="text-xs font-medium text-gray-500">{model.name}</span>
            </div>
          )}
          <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400 italic">
            did not respond
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
              <span className="text-xs text-gray-400 ml-1">
                ${cost.toFixed(4)}
              </span>
            )}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap">
          {content}
          {streaming && (
            <span className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
