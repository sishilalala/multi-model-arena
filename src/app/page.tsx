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
  const [hasSummary, setHasSummary] = useState(false);

  // Keep a ref for latest messages to avoid stale closures
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // ─── Persist active session to localStorage ──────────────────────────────

  // Save session state whenever key values change
  useEffect(() => {
    if (round > 0 && activeConversationId && messages.length > 0) {
      try {
        localStorage.setItem("arena-session", JSON.stringify({
          activeConversationId,
          messages,
          round,
          userQuestion,
          language,
          selectedModelIds,
          hasSummary,
        }));
      } catch {
        // ignore storage errors
      }
    }
  }, [messages, round, activeConversationId, userQuestion, language, selectedModelIds, hasSummary]);

  // Restore session on mount
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem("arena-session");
      if (!saved) return;
      const session = JSON.parse(saved);
      if (session.activeConversationId && session.messages?.length > 0) {
        setActiveConversationId(session.activeConversationId);
        setMessages(session.messages);
        setRound(session.round || 0);
        setUserQuestion(session.userQuestion || "");
        setLanguage(session.language || "English");
        setSelectedModelIds(session.selectedModelIds || []);
        setHasSummary(session.hasSummary || false);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

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

    // Stream responses from all selected models in parallel
    const promises = selectedModelIds.map((modelId) => {
      const info = getModelInfo(modelId, customModels);
      return streamModelResponse(
        modelId,
        info.name,
        info.color,
        question,
        1,
        []
      ).then((result) => ({
        modelName: info.name,
        content: result.content,
        error: result.error,
      }));
    });

    const results = await Promise.allSettled(promises);
    const responses: ModelResponse[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && !result.value.error) {
        responses.push({ modelName: result.value.modelName, content: result.value.content });
      }
    }

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

    // Gather the previous round's model responses + any user follow-ups
    const recentMessages = messagesRef.current;
    const prevResponses: ModelResponse[] = [];

    // Get model responses from the latest round
    const modelMsgs = recentMessages
      .filter((m) => m.role === "model" && !m.error)
      .slice(-selectedModelIds.length);
    for (const m of modelMsgs) {
      const info = getModelInfo(m.modelId ?? "", customModels);
      prevResponses.push({ modelName: info.name, content: m.content });
    }

    // Include any user follow-up messages added after the last model response
    const lastModelIdx = recentMessages.findLastIndex((m) => m.role === "model");
    if (lastModelIdx >= 0) {
      const followUps = recentMessages
        .slice(lastModelIdx + 1)
        .filter((m) => m.role === "user");
      for (const m of followUps) {
        prevResponses.push({ modelName: "User", content: m.content });
      }
    }

    // Stream new round responses in parallel
    const debatePromises = selectedModelIds.map((modelId) => {
      const info = getModelInfo(modelId, customModels);
      return streamModelResponse(
        modelId,
        info.name,
        info.color,
        userQuestion,
        nextRound,
        prevResponses
      ).then((result) => ({
        modelName: info.name,
        content: result.content,
        error: result.error,
      }));
    });

    const debateResults = await Promise.allSettled(debatePromises);
    const responses: ModelResponse[] = [];
    for (const result of debateResults) {
      if (result.status === "fulfilled" && !result.value.error) {
        responses.push({ modelName: result.value.modelName, content: result.value.content });
      }
    }

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

      // Update conversation memory
      try {
        await fetch("/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: userQuestion, summary: summaryContent }),
        });
      } catch {
        // non-fatal
      }
    }

    setHasSummary(true);
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
    setHasSummary(false);
    try { localStorage.removeItem("arena-session"); } catch {}
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
        let parsedTitle = "";
        let parsedRound = 0;
        let parsedModelNames: string[] = [];
        let hasSummarySection = false;

        for (const line of lines) {
          // Title line (user's question)
          const titleMatch = line.match(/^# (.+)$/);
          if (titleMatch) {
            parsedTitle = titleMatch[1];
            parsed.push({
              id: nextId(),
              role: "user",
              content: parsedTitle,
            });
            continue;
          }

          // Metadata: *Debate rounds: N*
          const roundMatch = line.match(/^\*Debate rounds:\s*(\d+)\*$/);
          if (roundMatch) {
            parsedRound = parseInt(roundMatch[1], 10);
            continue;
          }

          // Metadata: *Models: ...*
          const modelsMatch = line.match(/^\*Models:\s*(.+)\*$/);
          if (modelsMatch) {
            parsedModelNames = modelsMatch[1].split(",").map((s) => s.trim());
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
            hasSummarySection = true;
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

          // Skip round headers and other metadata lines
          if (line.match(/^## Round/) || line.match(/^\*.*\*$/)) {
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

        // Restore conversation state so debate controls appear
        setRound(parsedRound > 0 ? parsedRound : 1);
        setPhase("idle");
        setUserQuestion(parsedTitle);
        setHasSummary(hasSummarySection);
        if (parsedTitle) {
          setLanguage(detectLanguage(parsedTitle));
        }

        // Restore selected models from metadata if available
        if (parsedModelNames.length > 0) {
          const resolvedIds = parsedModelNames
            .map((name) => resolveModelIdFromName(name))
            .filter((id) => id.length > 0);
          if (resolvedIds.length > 0) {
            setSelectedModelIds(resolvedIds);
          }
        }
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

  // ─── handleUserFollowUp ──────────────────────────────────────────────────

  function handleUserFollowUp() {
    const text = inputValue.trim();
    if (!text || phase !== "idle" || round === 0) return;

    setInputValue("");

    // Add the user's follow-up as a message in the chat
    const userMsg: Message = {
      id: nextId(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Update the user question to include this follow-up so the next debate
    // round sees it as part of the conversation context
    setUserQuestion((prev) => prev + "\n\n[User follow-up]: " + text);
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
  const inputDisabled = isResponding || hasSummary;
  const showControlBar = round > 0 && phase === "idle" && !hasSummary;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF9F6]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId ?? undefined}
        onSelect={(id) => { handleSelectConversation(id); setSidebarOpen(false); }}
        onNew={() => { handleNewConversation(); setSidebarOpen(false); }}
        onDelete={handleDeleteConversation}
        onOpenSettings={() => window.open("/settings", "_blank")}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E0D8] bg-[#FAF9F6] shrink-0">
          {/* Hamburger button — only visible on small screens */}
          <button
            className="md:hidden p-1.5 rounded-lg text-[#8B7E74] hover:bg-[#E8E0D8] transition-colors"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
          </button>
          <ConnectionStatus />
        </div>

        {/* Chat area */}
        <ChatArea messages={messages} topic={userQuestion || undefined} onRetry={handleRetry} customModels={customModels} />

        {/* Control bar */}
        {showControlBar && (
          <ControlBar
            round={round}
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
            onSend={round > 0 ? handleUserFollowUp : handleSend}
            disabled={inputDisabled}
            placeholder={
              hasSummary
                ? "Start a new conversation to continue"
                : round > 0
                  ? "Add your thoughts before the next round (optional)..."
                  : "Ask a question or enter a topic for models to debate…"
            }
          />
        </div>
      </div>
    </div>
  );
}
