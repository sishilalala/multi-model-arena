import type { NextRequest } from "next/server";
import {
  createConversation,
  appendToConversation,
  updateRoundCount,
} from "@/lib/conversations";
import type { Language } from "@/lib/language";

interface CreatePayload {
  title: string;
  models: string[];
  language: Language;
  responses: Array<{ modelName: string; content: string }>;
}

interface AppendRoundPayload {
  conversationId: string;
  round: number;
  responses: Array<{ modelName: string; content: string }>;
}

interface AppendSummaryPayload {
  conversationId: string;
  summary: string;
  moderatorName: string;
}

type RequestPayload = CreatePayload | AppendRoundPayload | AppendSummaryPayload;

function isAppendRound(body: RequestPayload): body is AppendRoundPayload {
  return "conversationId" in body && "round" in body && "responses" in body;
}

function isAppendSummary(body: RequestPayload): body is AppendSummaryPayload {
  return "conversationId" in body && "summary" in body;
}

function formatResponses(
  responses: Array<{ modelName: string; content: string }>
): string {
  return responses
    .map(
      (r) => `### ${r.modelName}\n\n${r.content.trim()}\n`
    )
    .join("\n---\n\n");
}

export async function POST(request: NextRequest) {
  let body: RequestPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Append summary
    if (isAppendSummary(body)) {
      const { conversationId, summary, moderatorName } = body;
      const section = `\n## Summary by ${moderatorName}\n\n${summary.trim()}\n`;
      appendToConversation(conversationId, section);
      return Response.json({ success: true });
    }

    // Append debate round
    if (isAppendRound(body)) {
      const { conversationId, round, responses } = body;
      const section =
        `\n## Round ${round}\n\n` + formatResponses(responses) + "\n";
      appendToConversation(conversationId, section);
      updateRoundCount(conversationId, round);
      return Response.json({ success: true });
    }

    // Create new conversation
    const { title, models, language, responses } = body as CreatePayload;
    if (!title || !models || !language || !responses) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = createConversation(title, models, language);
    const section =
      `## Round 1\n\n` + formatResponses(responses) + "\n";
    appendToConversation(id, section);
    updateRoundCount(id, 1);

    return Response.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
