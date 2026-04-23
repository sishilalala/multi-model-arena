import type { CustomModel } from "./config";

export interface ModelInfo {
  id: string;
  name: string;
  color: string;
  providerId: string;
}

export const DEFAULT_MODELS: ModelInfo[] = [
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", color: "#d97706", providerId: "openrouter" },
  { id: "openai/gpt-5.4", name: "GPT-5.4", color: "#10b981", providerId: "openrouter" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", color: "#4285f4", providerId: "openrouter" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", color: "#3b82f6", providerId: "openrouter" },
  { id: "xiaomi/mimo-v2-pro", name: "MiMo-V2-Pro", color: "#f97316", providerId: "openrouter" },
  { id: "qwen/qwen3.6-plus", name: "Qwen 3.6 Plus", color: "#7c3aed", providerId: "openrouter" },
  { id: "bytedance-seed/seed-2.0-pro", name: "Seed 2.0 Pro", color: "#8b5cf6", providerId: "openrouter" },
];

// Random warm colors for custom models
const CUSTOM_COLORS = ["#0891b2", "#7c3aed", "#db2777", "#059669", "#dc2626", "#4f46e5", "#ca8a04", "#9333ea"];

export function getAllModels(customModels: CustomModel[] = []): ModelInfo[] {
  return [...DEFAULT_MODELS, ...customModels];
}

export function getModelInfo(modelId: string, customModels: CustomModel[] = []): ModelInfo {
  const allModels = getAllModels(customModels);
  const found = allModels.find((m) => m.id === modelId);
  if (found) return found;
  return { id: modelId, name: modelId.split("/").pop() || modelId, color: "#6b7280", providerId: "openrouter" };
}

export function pickCustomColor(existingModels: ModelInfo[]): string {
  const usedColors = new Set(existingModels.map((m) => m.color));
  for (const color of CUSTOM_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return CUSTOM_COLORS[Math.floor(Math.random() * CUSTOM_COLORS.length)];
}
