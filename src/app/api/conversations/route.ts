import type { NextRequest } from "next/server";
import {
  listConversations,
  readConversation,
  deleteConversation,
  clearAllConversations,
  moveConversationsFolder,
} from "@/lib/conversations";

/** GET /api/conversations        → list all
 *  GET /api/conversations?id=xxx → read one
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    try {
      const content = readConversation(id);
      return Response.json({ id, content });
    } catch {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
  }

  const conversations = listConversations();
  return Response.json(conversations);
}

/** PUT /api/conversations
 *  Body: { oldFolder: "...", newFolder: "..." } → move all conversation files
 */
export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { oldFolder, newFolder } = body as { oldFolder?: string; newFolder?: string };
  if (!oldFolder || !newFolder) {
    return Response.json({ error: "oldFolder and newFolder are required" }, { status: 400 });
  }

  try {
    moveConversationsFolder(oldFolder, newFolder);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

/** DELETE /api/conversations
 *  Body: { id: "..." }            → delete one
 *  Body: { clearAll: true, confirmation: "DELETE ALL" } → clear all
 */
export async function DELETE(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.clearAll === true) {
    if (body.confirmation !== "DELETE ALL") {
      return Response.json(
        { error: 'confirmation must be "DELETE ALL"' },
        { status: 400 }
      );
    }
    clearAllConversations();
    return Response.json({ success: true, message: "All conversations deleted" });
  }

  const id = body.id as string | undefined;
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  try {
    deleteConversation(id);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }
}
