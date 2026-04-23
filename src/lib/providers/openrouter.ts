import OpenAI from "openai";
import type { ChatMessage, ChatResponse, Provider, UsageData } from "./types";

export function createOpenRouterProvider(apiKey: string): Provider {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  return {
    id: "openrouter",
    name: "OpenRouter",

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

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const response = await client.chat.completions.create({
              model,
              messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
              temperature,
              stream: true,
              stream_options: { include_usage: true },
            });

            for await (const chunk of response) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                );
              }
              if (chunk.usage) {
                usageData.promptTokens = chunk.usage.prompt_tokens ?? 0;
                usageData.completionTokens = chunk.usage.completion_tokens ?? 0;
                usageData.totalTokens = chunk.usage.total_tokens ?? 0;
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
          baseURL: "https://openrouter.ai/api/v1",
        });
        await testClient.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };
}
