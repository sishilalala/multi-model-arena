"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import type { Message } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { ControlBar } from "@/components/ControlBar";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { SetupWizard } from "@/components/SetupWizard";

import { DEFAULT_MODELS, getModelInfo, getAllModels } from "@/lib/models";
import type { ModelInfo } from "@/lib/models";
import type { CustomModel } from "@/lib/config";
import type { ConversationMeta } from "@/lib/conversations";
import { detectLanguage } from "@/lib/language";
import type { Language } from "@/lib/language";

type Phase = "idle" | "responding" | "debating" | "summarizing";

let messageCounter = 0;
function nextId(): string {
  return `msg-${++messageCounter}-${Date.now()}`;
}

interface ModelResponse {
  modelName: string;
  content: string;
}

export default function HomePage() {
  const router = useRouter();

  // Auth state
  const [hasApiKey, setHasApiKey] = useState<null | boolean>(null);

  // Conversation list
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(
    DEFAULT_MODELS.slice(0, 4).map((m) => m.id)
  );
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [userQuestion, setUserQuestion] = useState("");
  const [language, setLanguage] = useState<Language>("English");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [conversationCost, setConversationCost] = useState(0);

  // Keep a ref for latest messages to avoid stale closures
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // ─── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      // Check API key
      try {
        const res = await fetch("/api/keys?providerId=openrouter");
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.hasKey === true);
        } else {
          setHasApiKey(false);
        }
      } catch {
        setHasApiKey(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (hasApiKey) {
      loadConversations();
      loadDefaultModels();
    }
  }, [hasApiKey]);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data: ConversationMeta[] = await res.json();
        setConversations(data);
      }
    } catch {
      // silently fail
    }
  }

  async function loadDefaultModels() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const config = await res.json();
        if (Array.isArray(config.defaultModels) && config.defaultModels.length > 0) {
          setSelectedModelIds(config.defaultModels.slice(0, 8));
        }
        if (Array.isArray(config.customModels)) {
          setCustomModels(config.customModels);
        }
      }
    } catch {
      // silently fail
    }
  }

  // ─── Stream helper ────────────────────────────────────────────────────────

  const streamModelResponse = useCallback(
    async (
      modelId: string,
      modelName: string,
      color: string,
      question: string,
      currentRound: number,
      previousResponses: ModelResponse[]
    ): Promise<{ content: string; error?: boolean }> => {
      // Add a streaming placeholder message
      const msgId = nextId();
      const placeholderMsg: Message = {
        id: msgId,
        role: "model",
        modelId,
        content: "",
        streaming: true,
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            modelName,
            userMessage: question,
            language,
            round: currentRound,
            previousResponses,
          }),
        });

        if (!res.body) {
          throw new Error("No response body");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let errorOccurred = false;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                errorOccurred = true;
                accumulated = parsed.error;
              } else if (typeof parsed.content === "string") {
                accumulated += parsed.content;
              }
            } catch {
              // skip malformed SSE chunks
            }
          }

          // Update the streaming message progressively
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: accumulated } : m
            )
          );
        }

        // Finalize message — remove streaming flag
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: accumulated, streaming: false, error: errorOccurred }
              : m
          )
        );

        return { content: accumulated, error: errorOccurred };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "An error occurred";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: errMsg, streaming: false, error: true }
              : m
          )
        );
        return { content: errMsg, error: true };
      }
    },
    [language]
  );

  // ─── handleSend ───────────────────────────────────────────────────────────

  async function handleSend() {
    const question = inputValue.trim();
    if (!question || phase !== "idle") return;

    setInputValue("");
    setPhase("responding");

    const detectedLang = detectLanguage(question);
    setLanguage(detectedLang);
    setUserQuestion(question);
    setRound(1);

    // Add user message
    const userMsgId = nextId();
    const userMsg: Message = { id: userMsgId, role: "user", content: question };
    setMessages([userMsg]);

    // Stream responses from all selected models
    const responses: ModelResponse[] = [];
    for (const modelId of selectedModelIds) {
      const info = getModelInfo(modelId, customModels);
      const result = await streamModelResponse(
        modelId,
        info.name,
        info.color,
        question,
        1,
        []
      );
      if (!result.error) {
        responses.push({ modelName: info.name, content: result.content });
      }
    }

    // Estimate cost (rough heuristic: ~$0.001 per model per round)
    const costPerRound = selectedModelIds.length * 0.001;
    setEstimatedCost(costPerRound);
    setConversationCost(costPerRound);

    // Save conversation
    try {
      const res = await fetch("/api/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: question.slice(0, 80),
          models: selectedModelIds.map((id) => getModelInfo(id).name),
          language: detectedLang,
          responses,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(data.id);
        await loadConversations();
      }
    } catch {
      // non-fatal
    }

    setPhase("idle");
  }

  // ─── handleKeepDebating ───────────────────────────────────────────────────

  async function handleKeepDebating() {
    if (phase !== "idle") return;
    setPhase("debating");

    const nextRound = round + 1;
    setRound(nextRound);

    // Gather the previous round's model responses from state
    const prevResponses: ModelResponse[] = messagesRef.current
      .filter((m) => m.role === "model" && !m.error)
      .slice(-selectedModelIds.length)
      .map((m) => {
        const info = getModelInfo(m.modelId ?? "", customModels);
        return { modelName: info.name, content: m.content };
      });

    // Stream new round responses
    const responses: ModelResponse[] = [];
    for (const modelId of selectedModelIds) {
      const info = getModelInfo(modelId, customModels);
      const result = await streamModelResponse(
        modelId,
        info.name,
        info.color,
        userQuestion,
        nextRound,
        prevResponses
      );
      if (!result.error) {
        responses.push({ modelName: info.name, content: result.content });
      }
    }

    // Update cost estimate
    const costPerRound = selectedModelIds.length * 0.001;
    setConversationCost((prev) => prev + costPerRound);

    // Append round to file
    if (activeConversationId) {
      try {
        await fetch("/api/conversations/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId,
            round: nextRound,
            responses,
          }),
        });
      } catch {
        // non-fatal
      }
    }

    setPhase("idle");
  }

  // ─── handleSummarize ──────────────────────────────────────────────────────

  async function handleSummarize() {
    if (phase !== "idle") return;
    setPhase("summarizing");

    // Build full conversation text from messages
    const fullConversation = messagesRef.current
      .filter((m) => m.role !== "moderator")
      .map((m) => {
        if (m.role === "user") return `User: ${m.content}`;
        const info = getModelInfo(m.modelId ?? "", customModels);
        return `${info.name}: ${m.content}`;
      })
      .join("\n\n");

    // Add streaming summary placeholder
    const summaryMsgId = nextId();
    const summaryPlaceholder: Message = {
      id: summaryMsgId,
      role: "moderator",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, summaryPlaceholder]);

    let summaryContent = "";
    let summaryError = false;

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalQuestion: userQuestion,
          fullConversation,
          language,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              summaryError = true;
              summaryContent = parsed.error;
            } else if (typeof parsed.content === "string") {
              summaryContent += parsed.content;
            }
          } catch {
            // skip
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === summaryMsgId ? { ...m, content: summaryContent } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === summaryMsgId
            ? { ...m, content: summaryContent, streaming: false, error: summaryError }
            : m
        )
      );
    } catch (err) {
      summaryContent = err instanceof Error ? err.message : "Summarization failed";
      summaryError = true;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === summaryMsgId
            ? { ...m, content: summaryContent, streaming: false, error: true }
            : m
        )
      );
    }

    // Append summary to file
    if (activeConversationId && !summaryError) {
      try {
        const settings = await fetch("/api/settings").then((r) => r.json());
        const moderatorName = getModelInfo(settings.moderatorModel ?? "", customModels).name;
        await fetch("/api/conversations/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId,
            summary: summaryContent,
            moderatorName,
          }),
        });
      } catch {
        // non-fatal
      }
    }

    setPhase("idle");
  }

  // ─── handleNewConversation ────────────────────────────────────────────────

  function handleNewConversation() {
    setMessages([]);
    setActiveConversationId(null);
    setRound(0);
    setPhase("idle");
    setUserQuestion("");
    setLanguage("English");
    setInputValue("");
    setEstimatedCost(0);
    setConversationCost(0);
  }

  // ─── handleSelectConversation ─────────────────────────────────────────────

  async function handleSelectConversation(id: string) {
    setActiveConversationId(id);
    try {
      const res = await fetch(`/api/conversations?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        const content: string = data.content ?? "";

        // Parse the markdown into individual messages
        const parsed: Message[] = [];
        const lines = content.split("\n");
        let currentModel = "";
        let currentContent = "";
        let inSummary = false;
        let summaryContent = "";

        for (const line of lines) {
          // Title line (user's question)
          const titleMatch = line.match(/^# (.+)$/);
          if (titleMatch) {
            parsed.push({
              id: nextId(),
              role: "user",
              content: titleMatch[1],
            });
            continue;
          }

          // Summary section
          if (line.match(/^## Summary/)) {
            // Flush any current model content
            if (currentModel && currentContent.trim()) {
              parsed.push({
                id: nextId(),
                role: "model",
                modelId: resolveModelIdFromName(currentModel),
                content: currentContent.trim(),
              });
              currentModel = "";
              currentContent = "";
            }
            inSummary = true;
            continue;
          }

          if (inSummary) {
            summaryContent += line + "\n";
            continue;
          }

          // Model heading (### ModelName)
          const modelMatch = line.match(/^### (.+)$/);
          if (modelMatch) {
            // Flush previous model
            if (currentModel && currentContent.trim()) {
              parsed.push({
                id: nextId(),
                role: "model",
                modelId: resolveModelIdFromName(currentModel),
                content: currentContent.trim(),
              });
            }
            currentModel = modelMatch[1];
            currentContent = "";
            continue;
          }

          // Skip round headers and metadata lines
          if (line.match(/^## Round/) || line.match(/^\*.*\*/)) {
            continue;
          }

          // Accumulate content for current model
          if (currentModel) {
            currentContent += line + "\n";
          }
        }

        // Flush last model
        if (currentModel && currentContent.trim()) {
          parsed.push({
            id: nextId(),
            role: "model",
            modelId: resolveModelIdFromName(currentModel),
            content: currentContent.trim(),
          });
        }

        // Add summary if present
        if (summaryContent.trim()) {
          parsed.push({
            id: nextId(),
            role: "moderator",
            content: summaryContent.trim(),
          });
        }

        setMessages(parsed.length > 0 ? parsed : [{
          id: nextId(),
          role: "user",
          content: "(Empty conversation)",
        }]);
        setRound(0);
        setPhase("idle");
        setUserQuestion("");
      }
    } catch {
      // silently fail
    }
  }

  // Helper to find a model ID from display name
  function resolveModelIdFromName(name: string): string {
    const allModels = getAllModels(customModels);
    const found = allModels.find(
      (m) => m.name === name || m.name.toLowerCase() === name.toLowerCase()
    );
    return found?.id || name;
  }

  // ─── handleDeleteConversation ─────────────────────────────────────────────

  async function handleDeleteConversation(id: string) {
    try {
      await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (activeConversationId === id) {
        handleNewConversation();
      }
      await loadConversations();
    } catch {
      // silently fail
    }
  }

  // ─── handleRetry ──────────────────────────────────────────────────────────

  async function handleRetry(messageId: string, modelId: string) {
    if (phase !== "idle") return;
    setPhase("responding");

    const info = getModelInfo(modelId, customModels);

    // Figure out which round this failed message was in
    const failedMsg = messagesRef.current.find((m) => m.id === messageId);
    const failedRound = round; // Use current round as best guess

    // Gather previous responses from other models (same round, non-error)
    const prevResponses: ModelResponse[] = messagesRef.current
      .filter((m) => m.role === "model" && !m.error && m.id !== messageId)
      .slice(-selectedModelIds.length)
      .map((m) => {
        const mInfo = getModelInfo(m.modelId ?? "", customModels);
        return { modelName: mInfo.name, content: m.content };
      });

    // Remove the failed message
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    // Retry the model
    const result = await streamModelResponse(
      modelId,
      info.name,
      info.color,
      userQuestion,
      failedRound || 1,
      failedRound > 1 ? prevResponses : []
    );

    setPhase("idle");
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  // Loading state
  if (hasApiKey === null) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#FAF9F6]">
        <svg
          className="animate-spin w-8 h-8 text-[#C96A2E]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  // Setup wizard
  if (hasApiKey === false) {
    return (
      <SetupWizard
        onComplete={() => {
          setHasApiKey(true);
        }}
      />
    );
  }

  const isResponding = phase !== "idle";
  const inputDisabled = isResponding || round > 0;
  const showControlBar = round > 0 && phase === "idle";

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF9F6]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId ?? undefined}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onOpenSettings={() => window.open("/settings", "_blank")}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-end px-4 py-2 border-b border-[#E8E0D8] bg-[#FAF9F6] shrink-0">
          <ConnectionStatus />
        </div>

        {/* Chat area */}
        <ChatArea messages={messages} topic={userQuestion || undefined} onRetry={handleRetry} customModels={customModels} />

        {/* Control bar */}
        {showControlBar && (
          <ControlBar
            round={round}
            estimatedCost={estimatedCost}
            conversationCost={conversationCost}
            allModels={getAllModels(customModels)}
            selectedModelIds={selectedModelIds}
            onKeepDebating={handleKeepDebating}
            onSummarize={handleSummarize}
            onModelsChange={setSelectedModelIds}
            isResponding={isResponding}
          />
        )}

        {/* Chat input */}
        <div className="px-4 py-3 border-t border-[#E8E0D8] bg-[#FAF9F6] shrink-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            disabled={inputDisabled}
            placeholder={
              round > 0
                ? "Use the controls above to keep debating or summarize"
                : "Ask a question or enter a topic for models to debate…"
            }
          />
        </div>
      </div>
    </div>
  );
}
