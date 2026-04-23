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
      className="rounded-lg shadow-xl p-0 backdrop:bg-black/50 w-full max-w-md"
    >
      <div className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>

        {requireInput != null && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Type{" "}
              <span className="font-mono font-semibold text-gray-700">
                {requireInput}
              </span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
