import { useState, useCallback, useEffect } from "react";
import {
  listConversations,
  readConversation,
  deleteConversation,
} from "../../lib/conversations.js";
import type { ConversationMeta } from "../../lib/conversations.js";
import { getAllModels } from "../../lib/models.js";
import { readConfig } from "../../lib/config.js";
import { detectLanguage } from "../../lib/language.js";
import type { Language } from "../../lib/language.js";
import type { Message } from "./useChat.js";

export interface ParsedConversation {
  messages: Message[];
  round: number;
  question: string;
  hasSummary: boolean;
  language: Language;
  modelIds: string[];
}

let msgCounter = 0;
function nextId(): string {
  return `conv-msg-${++msgCounter}-${Date.now()}`;
}

export interface UseConversationsReturn {
  conversations: ConversationMeta[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  refresh: () => void;
  remove: (id: string) => void;
  parseConversation: (id: string) => ParsedConversation | null;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const refresh = useCallback(() => {
    try {
      const list = listConversations();
      setConversations(list);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    try {
      deleteConversation(id);
    } catch {
      // ignore errors (file may already be gone)
    }
    refresh();
  }, [refresh]);

  const parseConversation = useCallback((id: string): ParsedConversation | null => {
    try {
      const raw = readConversation(id);
      const config = readConfig();
      const allModels = getAllModels(config.customModels);

      // Extract front-matter
      const headerMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
      if (!headerMatch) return null;
      const headerBlock = headerMatch[1];

      const titleMatch = headerBlock.match(/^title:\s*(.+)$/m);
      const modelsMatch = headerBlock.match(/^models:\s*(.+)$/m);
      const roundsMatch = headerBlock.match(/^rounds:\s*(\d+)$/m);
      const langMatch = headerBlock.match(/^language:\s*(.+)$/m);

      const modelNames = modelsMatch
        ? modelsMatch[1].split(",").map((s) => s.trim())
        : [];
      const round = roundsMatch ? parseInt(roundsMatch[1], 10) : 0;
      const language = (langMatch ? langMatch[1].trim() : "English") as Language;

      // Resolve model names back to IDs
      const modelIds: string[] = modelNames.map((name) => {
        const found = allModels.find(
          (m) => m.name === name || m.id === name
        );
        return found ? found.id : name;
      });

      // Extract body after front-matter
      const body = raw.slice(headerMatch[0].length);

      const messages: Message[] = [];
      let question = titleMatch ? titleMatch[1].trim() : "";
      let hasSummary = false;

      // Parse "## Question" block
      const questionMatch = body.match(/^## Question\n\n([\s\S]*?)(?=^## |\z)/m);
      if (questionMatch) {
        question = questionMatch[1].trim();
        messages.push({
          id: nextId(),
          role: "user",
          content: question,
          round: 1,
        });
      }

      // Parse round blocks: ## Round N, then ### ModelName sections
      const roundRegex = /^## Round (\d+)\n\n([\s\S]*?)(?=^## |\z)/gm;
      let roundMatch: RegExpExecArray | null;

      while ((roundMatch = roundRegex.exec(body)) !== null) {
        const roundNum = parseInt(roundMatch[1], 10);
        const roundBody = roundMatch[2];

        // Parse model sections within this round: ### ModelName
        const modelSectionRegex = /^### (.+?)\n\n([\s\S]*?)(?=^### |\z)/gm;
        let modelMatch: RegExpExecArray | null;

        while ((modelMatch = modelSectionRegex.exec(roundBody)) !== null) {
          const modelName = modelMatch[1].replace(/\s*\(retry\)$/, "").trim();
          const content = modelMatch[2].trim();

          const foundModel = allModels.find(
            (m) => m.name === modelName || m.id === modelName
          );
          const modelId = foundModel ? foundModel.id : modelName;

          messages.push({
            id: nextId(),
            role: "assistant",
            modelId,
            modelName: foundModel ? foundModel.name : modelName,
            content,
            round: roundNum,
          });
        }
      }

      // Parse summary block
      const summaryMatch = body.match(/^## Summary\n\n([\s\S]*?)(?=^## |\z)/m);
      if (summaryMatch) {
        hasSummary = true;
        messages.push({
          id: nextId(),
          role: "summary",
          content: summaryMatch[1].trim(),
        });
      }

      return {
        messages,
        round,
        question,
        hasSummary,
        language,
        modelIds,
      };
    } catch {
      return null;
    }
  }, []);

  return {
    conversations,
    selectedIndex,
    setSelectedIndex,
    refresh,
    remove,
    parseConversation,
  };
}
