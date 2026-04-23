export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
}

export interface ChatResponse {
  stream: ReadableStream<Uint8Array>;
  getUsage: () => Promise<UsageData>;
}

export interface Provider {
  id: string;
  name: string;
  chat(params: { model: string; messages: ChatMessage[]; temperature: number }): Promise<ChatResponse>;
  validateKey(apiKey: string): Promise<boolean>;
}
