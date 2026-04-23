import fs from "fs";
import path from "path";
import slugify from "slugify";
import { readConfig } from "./config";
import type { Language } from "./language";

export interface ConversationMeta {
  id: string;
  title: string;
  date: string;
  models: string[];
  rounds: number;
  language: Language;
}

const MEMORY_FILE = "memory.md";

function getFolder(): string {
  return readConfig().conversationsFolder;
}

function ensureFolder(folder: string): void {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

function filePath(folder: string, id: string): string {
  return path.join(folder, `${id}.md`);
}

/**
 * Parse the YAML-ish front-matter block at the top of a conversation file.
 * Expected format:
 *
 * ---
 * title: ...
 * date: YYYY-MM-DD
 * models: model1, model2
 * rounds: N
 * language: English
 * ---
 */
function parseHeader(content: string): Partial<ConversationMeta> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const meta: Partial<ConversationMeta> = {};

  const titleMatch = block.match(/^title:\s*(.+)$/m);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const dateMatch = block.match(/^date:\s*(.+)$/m);
  if (dateMatch) meta.date = dateMatch[1].trim();

  const modelsMatch = block.match(/^models:\s*(.+)$/m);
  if (modelsMatch) meta.models = modelsMatch[1].split(",").map((s) => s.trim());

  const roundsMatch = block.match(/^rounds:\s*(\d+)$/m);
  if (roundsMatch) meta.rounds = parseInt(roundsMatch[1], 10);

  const langMatch = block.match(/^language:\s*(.+)$/m);
  if (langMatch) meta.language = langMatch[1].trim() as Language;

  return meta;
}

function buildHeader(title: string, date: string, models: string[], language: Language, rounds = 0): string {
  return `---\ntitle: ${title}\ndate: ${date}\nmodels: ${models.join(", ")}\nrounds: ${rounds}\nlanguage: ${language}\n---\n\n`;
}

/** List all conversations sorted by date descending. Skips memory.md. */
export function listConversations(): ConversationMeta[] {
  const folder = getFolder();
  ensureFolder(folder);

  const files = fs.readdirSync(folder).filter(
    (f) => f.endsWith(".md") && f !== MEMORY_FILE
  );

  const result: ConversationMeta[] = [];

  for (const file of files) {
    try {
      const id = file.replace(/\.md$/, "");
      const content = fs.readFileSync(filePath(folder, id), "utf-8");
      const meta = parseHeader(content);
      result.push({
        id,
        title: meta.title ?? id,
        date: meta.date ?? "",
        models: meta.models ?? [],
        rounds: meta.rounds ?? 0,
        language: meta.language ?? "English",
      });
    } catch {
      // skip unreadable files
    }
  }

  return result.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
}

/** Read the full content of a conversation file by ID. */
export function readConversation(id: string): string {
  const folder = getFolder();
  const fp = filePath(folder, id);
  return fs.readFileSync(fp, "utf-8");
}

/** Create a new conversation file and return its ID. */
export function createConversation(title: string, models: string[], language: Language): string {
  const folder = getFolder();
  ensureFolder(folder);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = slugify(title, { lower: true, strict: true });
  const filename = `${date}-${slug}`;
  const header = buildHeader(title, date, models, language, 0);

  let filepath = path.join(folder, `${filename}.md`);
  let counter = 1;
  while (fs.existsSync(filepath)) {
    filepath = path.join(folder, `${filename}-${counter}.md`);
    counter++;
  }
  // Update id to match actual filename
  const actualFilename = path.basename(filepath, ".md");

  fs.writeFileSync(filepath, header, "utf-8");
  return actualFilename;
}

/** Append text to a conversation file. */
export function appendToConversation(id: string, content: string): void {
  const folder = getFolder();
  fs.appendFileSync(filePath(folder, id), content, "utf-8");
}

/** Update the rounds count in the header of a conversation file. */
export function updateRoundCount(id: string, rounds: number): void {
  const folder = getFolder();
  const fp = filePath(folder, id);
  const content = fs.readFileSync(fp, "utf-8");
  const updated = content.replace(/^rounds:\s*\d+$/m, `rounds: ${rounds}`);
  fs.writeFileSync(fp, updated, "utf-8");
}

/** Delete a single conversation file. */
export function deleteConversation(id: string): void {
  const folder = getFolder();
  fs.unlinkSync(filePath(folder, id));
}

/** Delete all .md files in the conversations folder except memory.md. */
export function clearAllConversations(): void {
  const folder = getFolder();
  ensureFolder(folder);

  const files = fs.readdirSync(folder).filter(
    (f) => f.endsWith(".md") && f !== MEMORY_FILE
  );
  for (const file of files) {
    fs.unlinkSync(path.join(folder, file));
  }
}

/** Move all .md files (except memory.md) from oldDir to newDir. */
export function moveConversationsFolder(oldDir: string, newDir: string): void {
  if (!fs.existsSync(oldDir)) return;
  fs.mkdirSync(newDir, { recursive: true });

  const files = fs.readdirSync(oldDir).filter(
    (f) => f.endsWith(".md") && f !== MEMORY_FILE
  );
  for (const file of files) {
    fs.renameSync(path.join(oldDir, file), path.join(newDir, file));
  }
}
