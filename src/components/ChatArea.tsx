"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { SummaryMessage } from "./SummaryMessage";

export interface Message {
  id: string;
  role: "user" | "model" | "moderator";
  modelId?: string;
  content: string;
  cost?: number;
  error?: boolean;
  streaming?: boolean;
}

interface ChatAreaProps {
  messages: Message[];
  topic?: string;
}

export function ChatArea({ messages, topic }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 overflow-y-auto py-4 scroll-smooth">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
          <div className="text-4xl">⚔️</div>
          <h2 className="text-xl font-semibold text-gray-700">
            Multi-Model Arena
          </h2>
          <p className="text-sm text-gray-500 max-w-sm">
            {topic
              ? `Topic: "${topic}"`
              : "Start a conversation to pit AI models against each other. Type a topic or question below."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {messages.map((msg) => {
            if (msg.role === "moderator") {
              return <SummaryMessage key={msg.id} content={msg.content} />;
            }
            return (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                modelId={msg.modelId}
                content={msg.content}
                cost={msg.cost}
                error={msg.error}
                streaming={msg.streaming}
              />
            );
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
