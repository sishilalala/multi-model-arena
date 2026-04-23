import { readMemory } from "@/lib/memory";
import { readConfig } from "@/lib/config";

/** GET /api/memory → { memory: "...", enabled: true/false } */
export async function GET() {
  const config = readConfig();
  const enabled = config.memoryEnabled;
  const memory = enabled ? readMemory() : "";
  return Response.json({ memory, enabled });
}
