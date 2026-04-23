"use client";

import { useState } from "react";
import type { ConversationMeta } from "@/lib/conversations";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

interface SidebarProps {
  conversations: ConversationMeta[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenSettings,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingConv = pendingDeleteId
    ? conversations.find((c) => c.id === pendingDeleteId)
    : null;

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setPendingDeleteId(id);
  }

  function handleConfirmDelete() {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  }

  function handleCancelDelete() {
    setPendingDeleteId(null);
  }

  return (
    <>
      <aside className="w-72 flex flex-col h-full border-r border-[#E8E0D8] bg-[#F2EDE8]">
        {/* Header */}
        <div className="p-3 border-b border-[#E8E0D8]">
          <Button variant="primary" size="sm" onClick={onNew} className="w-full rounded-lg">
            + New Conversation
          </Button>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#B0A49A] text-center mt-6 px-4">
              No conversations yet
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 px-2">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;
                const isHovered = hoveredId === conv.id;
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => onSelect(conv.id)}
                      onMouseEnter={() => setHoveredId(conv.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                        isActive
                          ? "bg-[#FAE8D4] border border-[#E8C4A8]"
                          : "border border-transparent hover:bg-[#EDE8E3]"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-[#7A3B1E]" : "text-[#2C2420]"
                          }`}
                        >
                          {conv.title}
                        </p>
                        <p className="text-xs text-[#B0A49A] mt-0.5">
                          {formatDate(conv.date)}
                        </p>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteClick(e, conv.id)}
                        aria-label={`Delete "${conv.title}"`}
                        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[#B0A49A] hover:text-red-500 hover:bg-red-50 transition-all ${
                          isHovered || isActive ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#E8E0D8]">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#8B7E74] hover:bg-[#EDE8E3] hover:text-[#5C4F46] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 flex-shrink-0 text-[#B0A49A]"
            >
              <path
                fillRule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.113a7.048 7.048 0 010-2.228L1.821 8.305a1 1 0 01-.206-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            Settings
          </button>
        </div>
      </aside>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId != null}
        title="Delete Conversation"
        message={
          pendingConv
            ? `Are you sure you want to delete "${pendingConv.title}"? This cannot be undone.`
            : "Are you sure you want to delete this conversation?"
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
