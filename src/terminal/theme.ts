export const COLORS = {
  bg: "#1a1a1a",
  sidebarBg: "#2a2a2a",
  border: "#444444",
  dimText: "#666666",
  inputBorder: "#555555",
  inputFocusBorder: "#888888",
  userMessage: "white",
  summaryBorder: "#FFD700",
  summaryText: "#FFD700",
} as const;

export const MODEL_COLORS: Record<string, string> = {
  "anthropic/claude-opus-4-6": "#FF9500",
  "openai/gpt-5.4": "#00FF88",
  "google/gemini-3.1-pro-preview": "#00AAFF",
  "google/gemini-2.5-flash": "#00AAFF",
  "deepseek/deepseek-r1": "#FF4444",
  "xiaomi/mimo-v2-pro": "#FF66FF",
  "qwen/qwen3.6-plus": "#AA88FF",
  "moonshotai/kimi-k2.6": "#00DDDD",
  "bytedance-seed/seed-2.0-pro": "#FFDD00",
};

const FALLBACK_COLORS = [
  "#FF9500", "#00FF88", "#00AAFF", "#FF4444",
  "#FF66FF", "#AA88FF", "#00DDDD", "#FFDD00",
];

export function getModelColor(modelId: string, customColor?: string): string {
  if (customColor) return customColor;
  return MODEL_COLORS[modelId] || FALLBACK_COLORS[Math.abs(hashCode(modelId)) % FALLBACK_COLORS.length];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
