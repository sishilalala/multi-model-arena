"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { SummaryMessage } from "./SummaryMessage";

export interface Message {
  id: string;
  role: "user" | "model" | "moderator";
  modelId?: string;
  content: string;
  error?: boolean;
  streaming?: boolean;
}

interface ChatAreaProps {
  messages: Message[];
  topic?: string;
  onRetry?: (messageId: string, modelId: string) => void;
  customModels?: import("@/lib/config").CustomModel[];
}

export function ChatArea({ messages, topic, onRetry, customModels }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 overflow-y-auto py-4 scroll-smooth bg-[#FAF9F6]">
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-[#FAE8D4] flex items-center justify-center text-2xl shadow-sm">
            ⚔️
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-[#2C2420]">
              Multi-Model Arena
            </h2>
            <p className="text-sm text-[#8B7E74] max-w-sm leading-relaxed">
              {topic
                ? `Topic: "${topic}"`
                : "Pit AI models against each other. Type any question or topic below to start a debate."}
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-[#B0A49A] bg-[#F2EDE8] rounded-full px-3 py-1.5">Compare answers</span>
            <span className="text-xs text-[#B0A49A] bg-[#F2EDE8] rounded-full px-3 py-1.5">Debate any topic</span>
            <span className="text-xs text-[#B0A49A] bg-[#F2EDE8] rounded-full px-3 py-1.5">Get a summary</span>
          </div>
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
                error={msg.error}
                streaming={msg.streaming}
                onRetry={msg.error && msg.modelId && onRetry ? () => onRetry(msg.id, msg.modelId!) : undefined}
                customModels={customModels}
              />
            );
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
