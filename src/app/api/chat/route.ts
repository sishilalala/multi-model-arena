import { readConfig } from "@/lib/config";
import { readMemory } from "@/lib/memory";
import { getProviderForModel } from "@/lib/providers";
import { buildDebatePrompt, buildInitialPrompt } from "@/lib/prompts";
import { isOverBudget } from "@/lib/usage";
import type { NextRequest } from "next/server";

import type { Language } from "@/lib/language";
import type { ChatMessage } from "@/lib/providers/types";

interface ChatRequestBody {
  modelId: string;
  modelName: string;
  userMessage: string;
  language: Language;
  round: number;
  previousResponses: Array<{ modelName: string; content: string }>;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

function errorStream(message: string): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { headers: SSE_HEADERS });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ChatRequestBody;
  const { modelId, modelName, userMessage, language, round, previousResponses } = body;

  const config = readConfig();

  if (isOverBudget(config.monthlySpendingLimit)) {
    return errorStream("Monthly spending limit reached. Please increase your budget in settings.");
  }

  const provider = await getProviderForModel(modelId, config.providers);
  if (!provider) {
    return errorStream(
      `No provider available for model "${modelId}". Please configure an API key in settings.`
    );
  }

  let systemPrompt: string;
  if (round === 1) {
    const memory = config.memoryEnabled ? readMemory() : undefined;
    systemPrompt = buildInitialPrompt({
      language,
      debateStyle: config.debateStyle,
      modelName,
      memory,
    });
  } else {
    systemPrompt = buildDebatePrompt({
      language,
      debateStyle: config.debateStyle,
      modelName,
      round,
      previousResponses,
    });
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    const { stream } = await provider.chat({
      model: modelId,
      messages,
      temperature: config.temperature,
    });
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return errorStream(message);
  }
}
