import { useState, useCallback, useRef } from "react";
import { readConfig } from "../../lib/config.js";
import { getModelInfo } from "../../lib/models.js";
import {
  createConversation,
  appendToConversation,
  updateRoundCount,
} from "../../lib/conversations.js";
import { readMemory, updateMemory } from "../../lib/memory.js";
import { detectLanguage } from "../../lib/language.js";
import {
  buildInitialPrompt,
  buildDebatePrompt,
  buildSummaryPrompt,
} from "../../lib/prompts.js";
import { getProviderForModel } from "../../lib/providers/index.js";
import type { ChatMessage as ProviderChatMessage } from "../../lib/providers/types.js";
import type { Language } from "../../lib/language.js";

export interface Message {
  id: string;
  role: "user" | "assistant" | "summary";
  modelId?: string;
  modelName?: string;
  content: string;
  error?: string;
  streaming?: boolean;
  round?: number;
}

export type Phase = "idle" | "responding" | "debating" | "summarizing";

export interface ChatState {
  messages: Message[];
  round: number;
  phase: Phase;
  userQuestion: string;
  language: Language;
  hasSummary: boolean;
  conversationId: string | null;
  selectedModelIds: string[];
  streamingProgress: Record<string, boolean>; // modelId -> still streaming
}

export interface UseChatReturn extends ChatState {
  sendQuestion: (question: string, modelIds: string[]) => Promise<void>;
  keepDebating: () => Promise<void>;
  summarize: () => Promise<void>;
  addUserFollowUp: (text: string) => void;
  retryModel: (messageId: string) => Promise<void>;
  resetChat: () => void;
  loadConversation: (params: {
    messages: Message[];
    round: number;
    question: string;
    hasSummary: boolean;
    language: Language;
    modelIds: string[];
    conversationId: string;
  }) => void;
}

let msgCounter = 0;
function nextId(): string {
  return `msg-${++msgCounter}-${Date.now()}`;
}

const STREAM_TIMEOUT_MS = 90_000;

async function streamResponse(
  stream: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Streaming timed out after 90s")), STREAM_TIMEOUT_MS)
  );

  async function readAll(): Promise<void> {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as { content?: string; error?: string };
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
    // flush decoder
    const remaining = decoder.decode();
    if (remaining) {
      for (const line of remaining.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as { content?: string; error?: string };
          if (parsed.error) onError(parsed.error);
          if (parsed.content) onChunk(parsed.content);
        } catch { /* skip */ }
      }
    }
  }

  await Promise.race([readAll(), timeout]).catch((err) => {
    reader.cancel().catch(() => {});
    onError(err instanceof Error ? err.message : "Stream error");
  });
}

export function useChat(): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    round: 0,
    phase: "idle",
    userQuestion: "",
    language: "English",
    hasSummary: false,
    conversationId: null,
    selectedModelIds: [],
    streamingProgress: {},
  });

  // Keep a ref to state for use inside async callbacks without stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  function setMessages(updater: (prev: Message[]) => Message[]) {
    setState((prev) => ({ ...prev, messages: updater(prev.messages) }));
  }

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  const sendQuestion = useCallback(async (question: string, modelIds: string[]) => {
    const config = readConfig();
    const language = detectLanguage(question);
    const memory = config.memoryEnabled ? readMemory() : "";

    // Create placeholder messages for each model
    const initialMessages: Message[] = [
      {
        id: nextId(),
        role: "user",
        content: question,
        round: 1,
      },
    ];

    const modelPlaceholders: Array<{ id: string; modelId: string; modelName: string }> = [];
    for (const modelId of modelIds) {
      const info = getModelInfo(modelId, config.customModels);
      const msgId = nextId();
      modelPlaceholders.push({ id: msgId, modelId, modelName: info.name });
      initialMessages.push({
        id: msgId,
        role: "assistant",
        modelId,
        modelName: info.name,
        content: "",
        streaming: true,
        round: 1,
      });
    }

    const streamingProgress: Record<string, boolean> = {};
    for (const { modelId } of modelPlaceholders) {
      streamingProgress[modelId] = true;
    }

    // Create the conversation file
    const conversationId = createConversation(question.slice(0, 60), modelIds, language);
    appendToConversation(conversationId, `## Question\n\n${question}\n\n`);
    appendToConversation(conversationId, `## Round 1\n\n`);

    setState((prev) => ({
      ...prev,
      messages: initialMessages,
      round: 1,
      phase: "responding",
      userQuestion: question,
      language,
      hasSummary: false,
      conversationId,
      selectedModelIds: modelIds,
      streamingProgress,
    }));

    // Stream all models in parallel
    await Promise.allSettled(
      modelPlaceholders.map(async ({ id: msgId, modelId, modelName }) => {
        try {
          const provider = await getProviderForModel(modelId, config.providers, config.customModels);
          if (!provider) {
            updateMessage(msgId, {
              error: "No provider available for this model",
              streaming: false,
            });
            setState((prev) => ({
              ...prev,
              streamingProgress: { ...prev.streamingProgress, [modelId]: false },
            }));
            return;
          }

          const systemPrompt = buildInitialPrompt({
            language,
            debateStyle: config.debateStyle,
            modelName,
            memory,
          });

          const chatMessages: ProviderChatMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ];

          const response = await provider.chat({
            model: modelId,
            messages: chatMessages,
            temperature: config.temperature,
          });

          let fullContent = "";
          await streamResponse(
            response.stream,
            (chunk) => {
              fullContent += chunk;
              updateMessage(msgId, { content: fullContent });
            },
            (errMsg) => {
              updateMessage(msgId, { error: errMsg, streaming: false });
              setState((prev) => ({
                ...prev,
                streamingProgress: { ...prev.streamingProgress, [modelId]: false },
              }));
            }
          );

          updateMessage(msgId, { content: fullContent, streaming: false });
          setState((prev) => ({
            ...prev,
            streamingProgress: { ...prev.streamingProgress, [modelId]: false },
          }));

          // Persist to file
          appendToConversation(conversationId, `### ${modelName}\n\n${fullContent}\n\n`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          updateMessage(msgId, { error: errMsg, streaming: false });
          setState((prev) => ({
            ...prev,
            streamingProgress: { ...prev.streamingProgress, [modelId]: false },
          }));
        }
      })
    );

    updateRoundCount(conversationId, 1);
    setState((prev) => ({ ...prev, phase: "idle" }));
  }, []);

  const keepDebating = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== "idle" || current.messages.length === 0) return;

    const config = readConfig();
    const nextRound = current.round + 1;
    const { language, userQuestion, conversationId, selectedModelIds } = current;

    if (!conversationId) return;

    // Gather previous round responses
    const prevRoundMessages = current.messages.filter(
      (m) => m.role === "assistant" && m.round === current.round && !m.error
    );
    const previousResponses = prevRoundMessages.map((m) => ({
      modelName: m.modelName ?? m.modelId ?? "Unknown",
      content: m.content,
    }));

    // Also collect user follow-ups (messages with role "user" and round > 1)
    const followUps = current.messages.filter(
      (m) => m.role === "user" && (m.round ?? 1) > 1
    );

    // Add placeholder messages for this round
    const newPlaceholders: Array<{ id: string; modelId: string; modelName: string }> = [];
    const newMessages: Message[] = [];

    for (const modelId of selectedModelIds) {
      const info = getModelInfo(modelId, config.customModels);
      const msgId = nextId();
      newPlaceholders.push({ id: msgId, modelId, modelName: info.name });
      newMessages.push({
        id: msgId,
        role: "assistant",
        modelId,
        modelName: info.name,
        content: "",
        streaming: true,
        round: nextRound,
      });
    }

    const streamingProgress: Record<string, boolean> = {};
    for (const { modelId } of newPlaceholders) {
      streamingProgress[modelId] = true;
    }

    appendToConversation(conversationId, `## Round ${nextRound}\n\n`);

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, ...newMessages],
      round: nextRound,
      phase: "debating",
      streamingProgress,
    }));

    await Promise.allSettled(
      newPlaceholders.map(async ({ id: msgId, modelId, modelName }) => {
        try {
          const provider = await getProviderForModel(modelId, config.providers, config.customModels);
          if (!provider) {
            updateMessage(msgId, { error: "No provider available", streaming: false });
            setState((prev) => ({
              ...prev,
              streamingProgress: { ...prev.streamingProgress, [modelId]: false },
            }));
            return;
          }

          const systemPrompt = buildDebatePrompt({
            language,
            debateStyle: config.debateStyle,
            modelName,
            round: nextRound,
            previousResponses,
          });

          // Build conversation context
          const chatMessages: ProviderChatMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userQuestion },
          ];

          // Add follow-ups as user messages if any
          for (const fu of followUps) {
            chatMessages.push({ role: "user", content: fu.content });
          }

          const response = await provider.chat({
            model: modelId,
            messages: chatMessages,
            temperature: config.temperature,
          });

          let fullContent = "";
          await streamResponse(
            response.stream,
            (chunk) => {
              fullContent += chunk;
              updateMessage(msgId, { content: fullContent });
            },
            (errMsg) => {
              updateMessage(msgId, { error: errMsg, streaming: false });
              setState((prev) => ({
                ...prev,
                streamingProgress: { ...prev.streamingProgress, [modelId]: false },
              }));
            }
          );

          updateMessage(msgId, { content: fullContent, streaming: false });
          setState((prev) => ({
            ...prev,
            streamingProgress: { ...prev.streamingProgress, [modelId]: false },
          }));

          appendToConversation(conversationId, `### ${modelName}\n\n${fullContent}\n\n`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          updateMessage(msgId, { error: errMsg, streaming: false });
          setState((prev) => ({
            ...prev,
            streamingProgress: { ...prev.streamingProgress, [modelId]: false },
          }));
        }
      })
    );

    updateRoundCount(conversationId, nextRound);
    setState((prev) => ({ ...prev, phase: "idle" }));
  }, []);

  const summarize = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== "idle" || !current.conversationId) return;

    const config = readConfig();
    const { language, userQuestion, conversationId } = current;

    // Build the full conversation text for the summary prompt
    const assistantMessages = current.messages.filter(
      (m) => m.role === "assistant" && !m.error
    );
    const fullConversation = assistantMessages
      .map((m) => `**${m.modelName ?? m.modelId}** (Round ${m.round}):\n${m.content}`)
      .join("\n\n---\n\n");

    const summaryMsgId = nextId();
    setState((prev) => ({
      ...prev,
      phase: "summarizing",
      messages: [
        ...prev.messages,
        {
          id: summaryMsgId,
          role: "summary" as const,
          content: "",
          streaming: true,
        },
      ],
    }));

    try {
      const moderatorModel = config.moderatorModel;
      const provider = await getProviderForModel(moderatorModel, config.providers, config.customModels);
      if (!provider) {
        updateMessage(summaryMsgId, {
          error: "No provider available for moderator model",
          streaming: false,
        });
        setState((prev) => ({ ...prev, phase: "idle" }));
        return;
      }

      const systemPrompt = buildSummaryPrompt({
        language,
        originalQuestion: userQuestion,
        fullConversation,
      });

      const chatMessages: ProviderChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please provide the structured summary." },
      ];

      const response = await provider.chat({
        model: moderatorModel,
        messages: chatMessages,
        temperature: 0.3,
      });

      let summaryContent = "";
      await streamResponse(
        response.stream,
        (chunk) => {
          summaryContent += chunk;
          updateMessage(summaryMsgId, { content: summaryContent });
        },
        (errMsg) => {
          updateMessage(summaryMsgId, { error: errMsg, streaming: false });
        }
      );

      updateMessage(summaryMsgId, { content: summaryContent, streaming: false });

      // Persist summary to file
      appendToConversation(conversationId, `## Summary\n\n${summaryContent}\n\n`);

      // Update memory
      if (config.memoryEnabled) {
        updateMemory(userQuestion.slice(0, 60), summaryContent);
      }

      setState((prev) => ({ ...prev, phase: "idle", hasSummary: true }));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      updateMessage(summaryMsgId, { error: errMsg, streaming: false });
      setState((prev) => ({ ...prev, phase: "idle" }));
    }
  }, []);

  const addUserFollowUp = useCallback((text: string) => {
    const { round } = stateRef.current;
    setMessages((msgs) => [
      ...msgs,
      {
        id: nextId(),
        role: "user" as const,
        content: text,
        round: round + 1,
      },
    ]);
  }, []);

  const retryModel = useCallback(async (messageId: string) => {
    const current = stateRef.current;
    const msg = current.messages.find((m) => m.id === messageId);
    if (!msg || !msg.modelId) return;

    const config = readConfig();
    const { language, userQuestion, conversationId, selectedModelIds, round } = current;

    // Reset the message
    updateMessage(messageId, { content: "", error: undefined, streaming: true });
    setState((prev) => ({
      ...prev,
      streamingProgress: { ...prev.streamingProgress, [msg.modelId!]: true },
    }));

    try {
      const provider = await getProviderForModel(msg.modelId, config.providers, config.customModels);
      if (!provider) {
        updateMessage(messageId, { error: "No provider available", streaming: false });
        setState((prev) => ({
          ...prev,
          streamingProgress: { ...prev.streamingProgress, [msg.modelId!]: false },
        }));
        return;
      }

      const modelName = msg.modelName ?? msg.modelId;
      const memory = config.memoryEnabled ? readMemory() : "";

      let chatMessages: ProviderChatMessage[];
      if (msg.round === 1) {
        const systemPrompt = buildInitialPrompt({
          language,
          debateStyle: config.debateStyle,
          modelName,
          memory,
        });
        chatMessages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion },
        ];
      } else {
        const prevRound = (msg.round ?? 1) - 1;
        const prevRoundMessages = current.messages.filter(
          (m) => m.role === "assistant" && m.round === prevRound && !m.error && m.id !== messageId
        );
        const previousResponses = prevRoundMessages.map((m) => ({
          modelName: m.modelName ?? m.modelId ?? "Unknown",
          content: m.content,
        }));

        const systemPrompt = buildDebatePrompt({
          language,
          debateStyle: config.debateStyle,
          modelName,
          round: msg.round ?? round,
          previousResponses,
        });
        chatMessages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion },
        ];
      }

      const response = await provider.chat({
        model: msg.modelId,
        messages: chatMessages,
        temperature: config.temperature,
      });

      let fullContent = "";
      await streamResponse(
        response.stream,
        (chunk) => {
          fullContent += chunk;
          updateMessage(messageId, { content: fullContent });
        },
        (errMsg) => {
          updateMessage(messageId, { error: errMsg, streaming: false });
          setState((prev) => ({
            ...prev,
            streamingProgress: { ...prev.streamingProgress, [msg.modelId!]: false },
          }));
        }
      );

      updateMessage(messageId, { content: fullContent, streaming: false });
      setState((prev) => ({
        ...prev,
        streamingProgress: { ...prev.streamingProgress, [msg.modelId!]: false },
      }));

      if (conversationId) {
        appendToConversation(conversationId, `### ${modelName} (retry)\n\n${fullContent}\n\n`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      updateMessage(messageId, { error: errMsg, streaming: false });
      setState((prev) => ({
        ...prev,
        streamingProgress: { ...prev.streamingProgress, [msg.modelId!]: false },
      }));
    }
  }, []);

  const resetChat = useCallback(() => {
    setState({
      messages: [],
      round: 0,
      phase: "idle",
      userQuestion: "",
      language: "English",
      hasSummary: false,
      conversationId: null,
      selectedModelIds: [],
      streamingProgress: {},
    });
  }, []);

  const loadConversation = useCallback((params: {
    messages: Message[];
    round: number;
    question: string;
    hasSummary: boolean;
    language: Language;
    modelIds: string[];
    conversationId: string;
  }) => {
    setState({
      messages: params.messages,
      round: params.round,
      phase: "idle",
      userQuestion: params.question,
      language: params.language,
      hasSummary: params.hasSummary,
      conversationId: params.conversationId,
      selectedModelIds: params.modelIds,
      streamingProgress: {},
    });
  }, []);

  return {
    ...state,
    sendQuestion,
    keepDebating,
    summarize,
    addUserFollowUp,
    retryModel,
    resetChat,
    loadConversation,
  };
}
