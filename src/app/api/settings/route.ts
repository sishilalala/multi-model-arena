import { readConfig, writeConfig } from "@/lib/config";
import type { NextRequest } from "next/server";

export async function GET() {
  const config = readConfig();
  return Response.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = writeConfig(body);
  return Response.json(updated);
}
