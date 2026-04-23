"use client";

import { useRef, useCallback, KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type your message…",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    autoResize();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  }

  function handleSendClick() {
    if (!disabled && value.trim()) {
      onSend();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-[#E8E0D8] bg-white px-4 py-2.5 shadow-sm focus-within:border-[#C96A2E] focus-within:ring-1 focus-within:ring-[#C96A2E] transition-all">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-[#1a1a1a] placeholder-[#B0A49A] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 max-h-[200px] leading-relaxed py-0.5"
        style={{ height: "auto", minHeight: "24px" }}
      />
      <button
        onClick={handleSendClick}
        disabled={!canSend}
        aria-label="Send message"
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[#C96A2E] text-white hover:bg-[#B55D26] active:bg-[#A05020] disabled:bg-[#EDE8E3] disabled:text-[#B0A49A] disabled:cursor-not-allowed transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
        </svg>
      </button>
    </div>
  );
}
