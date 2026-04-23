export interface ModelInfo {
  id: string;
  name: string;
  color: string;
  providerId: string;
}

export const DEFAULT_MODELS: ModelInfo[] = [
  { id: "anthropic/claude-sonnet", name: "Claude Sonnet", color: "#d97706", providerId: "openrouter" },
  { id: "openai/gpt-4o", name: "GPT-4o", color: "#10b981", providerId: "openrouter" },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini Flash", color: "#3b82f6", providerId: "openrouter" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", color: "#ef4444", providerId: "openrouter" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", color: "#8b5cf6", providerId: "openrouter" },
  { id: "mistralai/mistral-medium-3", name: "Mistral Medium 3", color: "#f97316", providerId: "openrouter" },
];

export function getModelInfo(modelId: string): ModelInfo {
  const found = DEFAULT_MODELS.find((m) => m.id === modelId);
  if (found) return found;
  return { id: modelId, name: modelId.split("/").pop() || modelId, color: "#6b7280", providerId: "openrouter" };
}
