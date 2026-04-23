"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#C96A2E] text-white hover:bg-[#B55D26] active:bg-[#A05020] disabled:bg-[#E8C4A8] disabled:text-[#C8A080] disabled:cursor-not-allowed",
  secondary:
    "bg-[#EDE8E3] text-[#5C4F46] hover:bg-[#E5DDD6] active:bg-[#DDD5CB] disabled:bg-[#F5F0EB] disabled:text-[#B0A49A] disabled:cursor-not-allowed",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-[#5C4F46] hover:bg-[#EDE8E3] active:bg-[#E5DDD6] disabled:text-[#B0A49A] disabled:cursor-not-allowed",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C96A2E] focus-visible:ring-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
