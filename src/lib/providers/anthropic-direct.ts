import type { ChatMessage, ChatResponse, Provider, UsageData } from "./types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export function createAnthropicProvider(apiKey: string): Provider {
  return {
    id: "anthropic",
    name: "Anthropic",

    async chat({ model, messages, temperature }): Promise<ChatResponse> {
      const usageData: UsageData = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: null,
      };
      let usageResolve!: (data: UsageData) => void;
      const usagePromise = new Promise<UsageData>((resolve) => {
        usageResolve = resolve;
      });

      // Anthropic separates system messages from the messages array
      const systemMessage = messages.find((m) => m.role === "system");
      const nonSystemMessages: ChatMessage[] = messages.filter((m) => m.role !== "system");

      const body: Record<string, unknown> = {
        model,
        messages: nonSystemMessages,
        temperature,
        max_tokens: 8192,
        stream: true,
      };
      if (systemMessage) {
        body.system = systemMessage.content;
      }

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const response = await fetch(ANTHROPIC_API_URL, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": ANTHROPIC_VERSION,
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              const errorText = await response.text();
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errorText })}\n\n`)
              );
              return;
            }

            if (!response.body) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "No response body" })}\n\n`)
              );
              return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(":")) continue;

                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(data) as Record<string, unknown>;
                    const eventType = parsed.type as string | undefined;

                    if (eventType === "content_block_delta") {
                      const deltaObj = parsed.delta as Record<string, unknown> | undefined;
                      if (deltaObj?.type === "text_delta") {
                        const text = deltaObj.text as string;
                        if (text) {
                          controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                          );
                        }
                      }
                    } else if (eventType === "message_delta") {
                      const usageObj = parsed.usage as Record<string, unknown> | undefined;
                      if (usageObj) {
                        usageData.completionTokens = (usageObj.output_tokens as number) ?? 0;
                      }
                    } else if (eventType === "message_start") {
                      const message = parsed.message as Record<string, unknown> | undefined;
                      const msgUsage = message?.usage as Record<string, unknown> | undefined;
                      if (msgUsage) {
                        usageData.promptTokens = (msgUsage.input_tokens as number) ?? 0;
                      }
                    }
                  } catch {
                    // Ignore parse errors for non-JSON lines
                  }
                }
              }
            }

            usageData.totalTokens = usageData.promptTokens + usageData.completionTokens;
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
            );
          } finally {
            usageResolve(usageData);
            controller.close();
          }
        },
      });

      return {
        stream,
        getUsage: () => usagePromise,
      };
    },

    async validateKey(key: string): Promise<boolean> {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
        });
        // A 200 or 4xx with non-auth error means the key is valid
        return response.status !== 401 && response.status !== 403;
      } catch {
        return false;
      }
    },
  };
}
