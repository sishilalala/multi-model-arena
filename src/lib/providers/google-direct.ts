import { createOpenAICompatibleProvider } from "./openai-compatible";
import type { Provider } from "./types";

const GOOGLE_OPENAI_COMPAT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

export function createGoogleProvider(apiKey: string): Provider {
  return createOpenAICompatibleProvider({
    id: "google",
    name: "Google Gemini",
    baseUrl: GOOGLE_OPENAI_COMPAT_BASE_URL,
    apiKey,
  });
}
