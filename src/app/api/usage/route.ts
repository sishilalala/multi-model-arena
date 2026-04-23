import type { NextRequest } from "next/server";
import {
  recordUsage,
  getMonthlyUsage,
  getConversationCost,
  isOverBudget,
  estimateRoundCost,
  type UsageEntry,
} from "@/lib/usage";
import { readConfig } from "@/lib/config";

/**
 * GET /api/usage                                → current month usage
 * GET /api/usage?conversationId=xxx             → conversation cost
 * GET /api/usage?checkBudget=1                  → { overBudget, totalCost, limit }
 * GET /api/usage?estimate=1&modelCount=4&tokens=2000 → { estimatedCost }
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const conversationId = params.get("conversationId");
  if (conversationId) {
    const cost = getConversationCost(conversationId);
    return Response.json({ conversationId, cost });
  }

  if (params.get("checkBudget") === "1") {
    const config = readConfig();
    const limit = config.monthlySpendingLimit;
    const { totalCost } = getMonthlyUsage();
    return Response.json({
      overBudget: isOverBudget(limit),
      totalCost,
      limit,
    });
  }

  if (params.get("estimate") === "1") {
    const modelCount = parseInt(params.get("modelCount") ?? "2", 10);
    const tokens = parseInt(params.get("tokens") ?? "0", 10);
    const estimatedCost = estimateRoundCost(modelCount, tokens);
    return Response.json({ estimatedCost, modelCount, tokens });
  }

  const usage = getMonthlyUsage();
  return Response.json(usage);
}

/**
 * POST /api/usage
 * Body: UsageEntry
 */
export async function POST(request: NextRequest) {
  let body: Partial<UsageEntry>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { conversationId, model, inputTokens, outputTokens, cost } = body;

  if (!conversationId || !model || inputTokens == null || outputTokens == null || cost == null) {
    return Response.json(
      { error: "conversationId, model, inputTokens, outputTokens, and cost are required" },
      { status: 400 }
    );
  }

  const entry: UsageEntry = {
    conversationId,
    model,
    inputTokens,
    outputTokens,
    cost,
    timestamp: body.timestamp ?? new Date().toISOString(),
  };

  recordUsage(entry);
  return Response.json({ success: true, entry });
}
