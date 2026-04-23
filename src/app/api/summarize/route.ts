import { readConfig } from "@/lib/config";
import { getProviderForModel } from "@/lib/providers";
import { buildSummaryPrompt } from "@/lib/prompts";
import type { Language } from "@/lib/language";
import type { ChatMessage } from "@/lib/providers/types";
import type { NextRequest } from "next/server";

interface SummarizeRequestBody {
  originalQuestion: string;
  fullConversation: string;
  language: Language;
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
  const body = (await request.json()) as SummarizeRequestBody;
  const { originalQuestion, fullConversation, language } = body;

  const config = readConfig();

  const provider = await getProviderForModel(config.moderatorModel, config.providers, config.customModels);
  if (!provider) {
    return errorStream(
      `No provider available for moderator model "${config.moderatorModel}". Please configure an API key in settings.`
    );
  }

  const systemPrompt = buildSummaryPrompt({
    language,
    originalQuestion,
    fullConversation,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Please produce the structured debate summary now." },
  ];

  try {
    const { stream } = await provider.chat({
      model: config.moderatorModel,
      messages,
      temperature: 0.3,
    });
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return errorStream(message);
  }
}
