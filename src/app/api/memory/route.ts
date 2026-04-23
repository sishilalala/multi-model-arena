import type { NextRequest } from "next/server";
import { readMemory } from "@/lib/memory";
import { readConfig } from "@/lib/config";

/** GET /api/memory → { memory: "...", enabled: true/false } */
export async function GET() {
  const config = readConfig();
  const enabled = config.memoryEnabled;
  const memory = enabled ? readMemory() : "";
  return Response.json({ memory, enabled });
}

/** POST /api/memory → updates memory with { title, summary } */
export async function POST(request: NextRequest) {
  const { title, summary } = await request.json();
  if (!title || !summary) {
    return Response.json({ error: "title and summary required" }, { status: 400 });
  }
  const { updateMemory } = await import("@/lib/memory");
  updateMemory(title, summary);
  return Response.json({ success: true });
}
