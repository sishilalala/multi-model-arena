import OpenAI from "openai";
import type { ChatMessage, ChatResponse, Provider, UsageData } from "./types.js";

interface OpenAICompatibleParams {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

export function createOpenAICompatibleProvider(params: OpenAICompatibleParams): Provider {
  const { id, name, baseUrl, apiKey } = params;

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });

  return {
    id,
    name,

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

      // Use raw fetch instead of OpenAI SDK to properly handle
      // reasoning_content (used by Seed 2.0, DeepSeek R1)
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages,
                temperature,
                stream: true,
              }),
            });

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
            }

            const reader = response.body!.getReader();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  // Get actual content (not reasoning_content which is internal thinking)
                  const content = delta?.content || "";
                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    );
                  }

                  // Track usage
                  if (parsed.usage) {
                    usageData.promptTokens = parsed.usage.prompt_tokens ?? 0;
                    usageData.completionTokens = parsed.usage.completion_tokens ?? 0;
                    usageData.totalTokens = parsed.usage.total_tokens ?? 0;
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }

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
        const testClient = new OpenAI({
          apiKey: key,
          baseURL: baseUrl,
        });
        await testClient.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };
}
