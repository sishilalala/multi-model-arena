import fs from "fs";
import path from "path";
import { readConfig } from "./config";

const MEMORY_FILE = "memory.md";
const MAX_ENTRIES = 10;
const MAX_SUMMARY_CHARS = 500;

function memoryPath(): string {
  return path.join(readConfig().conversationsFolder, MEMORY_FILE);
}

function memoryHeader(): string {
  return "# Conversation Memory\n*Auto-updated. Last 10 conversations summarized for context.*\n";
}

/** Read memory.md. Returns empty string if missing or corrupted — never throws. */
export function readMemory(): string {
  try {
    const fp = memoryPath();
    if (!fs.existsSync(fp)) return "";
    return fs.readFileSync(fp, "utf-8");
  } catch {
    return "";
  }
}

interface MemoryEntry {
  title: string;
  date: string;
  summary: string;
}

function parseEntries(content: string): MemoryEntry[] {
  // Each entry starts with ### Title (YYYY-MM-DD)
  const entryRegex = /^### (.+?) \((\d{4}-\d{2}-\d{2})\)\n([\s\S]*?)(?=^### |\z)/gm;
  const entries: MemoryEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(content)) !== null) {
    entries.push({
      title: match[1].trim(),
      date: match[2].trim(),
      summary: match[3].trim(),
    });
  }
  return entries;
}

function formatEntry(entry: MemoryEntry): string {
  return `### ${entry.title} (${entry.date})\n${entry.summary}\n`;
}

/**
 * Prepend a new entry to memory.md, keep at most MAX_ENTRIES, write back.
 */
export function updateMemory(conversationTitle: string, summary: string): void {
  const truncatedSummary = summary.slice(0, MAX_SUMMARY_CHARS);
  const date = new Date().toISOString().slice(0, 10);

  const existing = readMemory();
  const entries = parseEntries(existing);

  const newEntry: MemoryEntry = {
    title: conversationTitle,
    date,
    summary: truncatedSummary,
  };

  // Prepend new entry, keep only MAX_ENTRIES
  const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);

  const body = updated.map(formatEntry).join("\n");
  const content = `${memoryHeader()}\n${body}`;

  try {
    const folder = readConfig().conversationsFolder;
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    fs.writeFileSync(memoryPath(), content, "utf-8");
  } catch {
    // silently fail — memory is best-effort
  }
}
