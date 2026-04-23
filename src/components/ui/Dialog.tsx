"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface DialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  /** If provided, user must type this exact string to enable the confirm button */
  requireInput?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  requireInput,
  onConfirm,
  onCancel,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
      setInputValue("");
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      onCancel();
    }
  }

  const confirmDisabled = requireInput != null && inputValue !== requireInput;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onCancel={onCancel}
      className="rounded-xl shadow-xl p-0 backdrop:bg-[#1a1a1a]/50 w-full max-w-md bg-[#FAF9F6] border border-[#E8E0D8]"
    >
      <div className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[#1a1a1a]">{title}</h2>
        <p className="text-sm text-[#5C4F46]">{message}</p>

        {requireInput != null && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B7E74]">
              Type{" "}
              <span className="font-mono font-semibold text-[#5C4F46]">
                {requireInput}
              </span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="border border-[#E8E0D8] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A2E] focus:border-transparent text-[#1a1a1a] placeholder-[#B0A49A]"
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
