"use client";

import React from "react";

interface SliderProps {
  label: string;
  leftLabel?: string;
  rightLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function Slider({
  label,
  leftLabel,
  rightLabel,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  disabled = false,
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#5C4F46]">
        {label}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#E8E0D8] accent-[#C96A2E] disabled:cursor-not-allowed disabled:opacity-50"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-[#8B7E74]">
          <span>{leftLabel ?? ""}</span>
          <span>{rightLabel ?? ""}</span>
        </div>
      )}
    </div>
  );
}
