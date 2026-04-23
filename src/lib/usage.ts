import fs from "fs";
import path from "path";

const USAGE_DIR = path.join(process.env.HOME || "~", ".multi-model-arena");
const USAGE_PATH = path.join(USAGE_DIR, "usage.json");

export interface UsageEntry {
  conversationId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string; // ISO 8601
}

type UsageStore = Record<string, UsageEntry[]>; // key: "YYYY-MM"

function ensureDir(): void {
  if (!fs.existsSync(USAGE_DIR)) {
    fs.mkdirSync(USAGE_DIR, { recursive: true });
  }
}

function readStore(): UsageStore {
  try {
    ensureDir();
    if (!fs.existsSync(USAGE_PATH)) return {};
    const raw = fs.readFileSync(USAGE_PATH, "utf-8");
    return JSON.parse(raw) as UsageStore;
  } catch {
    return {};
  }
}

function writeStore(store: UsageStore): void {
  ensureDir();
  fs.writeFileSync(USAGE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Record a single usage entry. */
export function recordUsage(entry: UsageEntry): void {
  const store = readStore();
  const key = monthKey(new Date(entry.timestamp));
  if (!store[key]) store[key] = [];
  store[key].push(entry);
  writeStore(store);
}

/** Return all entries for the current calendar month, keyed by "YYYY-MM". */
export function getMonthlyUsage(): { month: string; entries: UsageEntry[]; totalCost: number } {
  const store = readStore();
  const key = monthKey();
  const entries = store[key] ?? [];
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  return { month: key, entries, totalCost };
}

/** Sum costs for all entries belonging to a given conversation. */
export function getConversationCost(conversationId: string): number {
  const store = readStore();
  let total = 0;
  for (const entries of Object.values(store)) {
    for (const entry of entries) {
      if (entry.conversationId === conversationId) {
        total += entry.cost;
      }
    }
  }
  return total;
}

/** Return true if the current month's spend exceeds monthlyLimit (USD). */
export function isOverBudget(monthlyLimit: number): boolean {
  const { totalCost } = getMonthlyUsage();
  return totalCost >= monthlyLimit;
}

/**
 * Rough cost estimate for one debate round.
 * Assumes ~$0.002 per 1K tokens averaged across typical models.
 * conversationTokens is the running token count already in context.
 */
export function estimateRoundCost(modelCount: number, conversationTokens: number): number {
  const RATE_PER_1K = 0.002; // USD
  const tokensPerModel = conversationTokens + 500; // ~500 new output tokens per model
  return (tokensPerModel / 1000) * RATE_PER_1K * modelCount;
}
