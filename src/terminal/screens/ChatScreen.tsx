import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";
import clipboard from "clipboardy";
import { useChat } from "../hooks/useChat.js";
import { useConversations } from "../hooks/useConversations.js";
import { useConnection } from "../hooks/useConnection.js";
import { Sidebar } from "../components/Sidebar.js";
import { MessageBubble } from "../components/MessageBubble.js";
import { SummaryBox } from "../components/SummaryBox.js";
import { ControlBar } from "../components/ControlBar.js";
import { InputBar } from "../components/InputBar.js";
import { ModelPicker } from "../components/ModelPicker.js";
import { StatusDot } from "../components/StatusDot.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { readConfig } from "../../lib/config.js";

interface ChatScreenProps {
  onOpenSettings: () => void;
  onQuit: () => void;
}

type FocusPanel = "sidebar" | "chat";

export function ChatScreen({ onOpenSettings, onQuit }: ChatScreenProps): React.ReactElement {
  const chat = useChat();
  const convs = useConversations();
  const { online } = useConnection();
  const { exit } = useApp();

  const [inputValue, setInputValue] = useState("");
  const [focusPanel, setFocusPanel] = useState<FocusPanel>("chat");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showNewConvPicker, setShowNewConvPicker] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    convs.refresh();
  }, []);

  // Reload conversation list after a new conversation is saved
  useEffect(() => {
    if (chat.conversationId) {
      convs.refresh();
    }
  }, [chat.conversationId]);

  const config = readConfig();
  const maxRounds = 5; // or from config if available

  const isResponding =
    chat.phase === "responding" ||
    chat.phase === "debating" ||
    chat.phase === "summarizing";

  const inputIsEmpty = inputValue.trim() === "";
  const hasConversation = chat.round > 0;

  // Streaming progress display
  const streamingModels = Object.entries(chat.streamingProgress)
    .filter(([, streaming]) => streaming)
    .map(([modelId]) => {
      const info = config.customModels?.find((m) => m.id === modelId);
      return info ? info.name : modelId.split("/").pop() ?? modelId;
    });
  const streamingProgressText =
    streamingModels.length > 0 ? `streaming: ${streamingModels.join(", ")}` : "";

  // Global keyboard shortcuts
  useInput(
    (input, key) => {
      // Don't intercept if overlays are open
      if (showModelPicker || showNewConvPicker || deleteConfirmId) return;

      // Tab switches focus between panels
      if (key.tab) {
        setFocusPanel((prev) => (prev === "sidebar" ? "chat" : "sidebar"));
        return;
      }

      // When sidebar is focused, let sidebar handle navigation
      if (focusPanel === "sidebar") return;

      // Ctrl+S → settings
      if (key.ctrl && input === "s") {
        onOpenSettings();
        return;
      }

      // q → quit (only when chat is focused and input is empty)
      if (input === "q" && inputIsEmpty && !isResponding) {
        onQuit();
        exit();
        return;
      }

      // Single-letter shortcuts when chat focused, input empty, and there's a conversation
      if (inputIsEmpty && hasConversation && !isResponding) {
        if (input === "d") {
          chat.keepDebating();
          return;
        }
        if (input === "s") {
          chat.summarize();
          return;
        }
        if (input === "m") {
          // Show model picker to switch models
          setShowModelPicker(true);
          return;
        }
        if (input === "n") {
          // New conversation
          chat.resetChat();
          setShowNewConvPicker(true);
          return;
        }
        if (input === "r") {
          // Retry last errored model message
          const lastError = [...chat.messages]
            .reverse()
            .find((m) => m.role === "assistant" && m.error);
          if (lastError) {
            chat.retryModel(lastError.id);
          }
          return;
        }
        if (input === "c") {
          // Copy last summary to clipboard
          const lastSummary = [...chat.messages]
            .reverse()
            .find((m) => m.role === "summary");
          if (lastSummary) {
            clipboard.writeSync(lastSummary.content);
          }
          return;
        }
      }

      // n when no conversation (start new)
      if (input === "n" && inputIsEmpty && !hasConversation && !isResponding) {
        setShowNewConvPicker(true);
        return;
      }
    },
    { isActive: !showModelPicker && !showNewConvPicker && !deleteConfirmId }
  );

  const handleInputSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      setInputValue("");

      if (chat.round === 0) {
        // First message: pick models first
        setPendingQuestion(trimmed);
        setShowModelPicker(true);
      } else {
        // Follow-up in existing conversation
        chat.addUserFollowUp(trimmed);
      }
    },
    [chat]
  );

  const handleModelPickerConfirm = useCallback(
    (modelIds: string[]) => {
      setShowModelPicker(false);
      if (pendingQuestion) {
        chat.sendQuestion(pendingQuestion, modelIds);
        setPendingQuestion(null);
      } else {
        // Mid-conversation model change - update for next round
        chat.setSelectedModelIds(modelIds);
      }
    },
    [chat, pendingQuestion]
  );

  const handleNewConvPickerConfirm = useCallback(
    (modelIds: string[]) => {
      setShowNewConvPicker(false);
      // New conversation: wait for user to type a question
      // Reset chat with selected models (just start fresh, user will type)
      chat.resetChat();
      // Store the model selection for when user types
      // We can use pendingQuestion as signal - but here we need to start fresh
      // The user will type a question and next submit will use these models
      // We store the selected models for the next question
      setPendingQuestion(null);
      // Actually store in a separate state so sendQuestion uses them
      setSelectedModelsForNext(modelIds);
    },
    [chat]
  );

  const [selectedModelsForNext, setSelectedModelsForNext] = useState<string[]>([]);

  const handleInputSubmitWithModels = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      setInputValue("");

      if (chat.round === 0) {
        if (selectedModelsForNext.length > 0) {
          // Models already selected, send directly
          chat.sendQuestion(trimmed, selectedModelsForNext);
          setSelectedModelsForNext([]);
        } else {
          // Pick models first
          setPendingQuestion(trimmed);
          setShowModelPicker(true);
        }
      } else if (chat.hasSummary) {
        // Continue after summary - start new debate round with follow-up
        chat.continueAfterSummary(trimmed);
      } else {
        // Follow-up in existing conversation
        chat.addUserFollowUp(trimmed);
      }
    },
    [chat, selectedModelsForNext]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      const parsed = convs.parseConversation(id);
      if (!parsed) return;
      chat.loadConversation({
        ...parsed,
        conversationId: id,
      });
      setFocusPanel("chat");
    },
    [chat, convs]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setDeleteConfirmId(id);
    },
    []
  );

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmId) {
      const isActive = chat.conversationId === deleteConfirmId;
      convs.remove(deleteConfirmId);
      if (isActive) {
        chat.resetChat();
      }
      setDeleteConfirmId(null);
    }
  }, [chat, convs, deleteConfirmId]);

  // Determine input placeholder
  let inputPlaceholder = "Ask a question...";
  if (isResponding) {
    inputPlaceholder = "Responding...";
  } else if (chat.hasSummary) {
    inputPlaceholder = "Ask a follow-up to continue the debate...";
  } else if (hasConversation) {
    inputPlaceholder = "Follow-up or use shortcuts (d/s/m/n/r/c)...";
  } else if (selectedModelsForNext.length > 0) {
    inputPlaceholder = "Type your question...";
  }

  // Overlay: ConfirmDialog
  if (deleteConfirmId) {
    const conv = convs.conversations.find((c) => c.id === deleteConfirmId);
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <ConfirmDialog
          title="Delete Conversation"
          message={`Delete "${conv?.title ?? deleteConfirmId}"?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      </Box>
    );
  }

  // Overlay: ModelPicker for switching models in an existing conversation
  if (showModelPicker) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <ModelPicker
          initialSelected={chat.selectedModelIds.length > 0 ? chat.selectedModelIds : config.defaultModels}
          maxModels={4}
          onConfirm={handleModelPickerConfirm}
          onCancel={() => {
            setShowModelPicker(false);
            setPendingQuestion(null);
          }}
        />
      </Box>
    );
  }

  // Overlay: ModelPicker for new conversation
  if (showNewConvPicker) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
        <ModelPicker
          initialSelected={config.defaultModels}
          maxModels={4}
          onConfirm={handleNewConvPickerConfirm}
          onCancel={() => setShowNewConvPicker(false)}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="row" height="100%">
      {/* Sidebar */}
      <Sidebar
        conversations={convs.conversations}
        selectedIndex={convs.selectedIndex}
        activeConversationId={chat.conversationId}
        focused={focusPanel === "sidebar"}
        onSelect={handleSelectConversation}
        onSelectedIndexChange={convs.setSelectedIndex}
        onNew={() => {
          chat.resetChat();
          setShowNewConvPicker(true);
        }}
        onDelete={handleDeleteConversation}
        onOpenSettings={onOpenSettings}
      />

      {/* Main area */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Header */}
        <Box borderStyle="single" borderColor="#444444" paddingX={1} justifyContent="space-between">
          <Text bold color="yellow">⚔  Arena</Text>
          <Box>
            <StatusDot online={online} />
            <Text dimColor>  [Tab] switch panel  [Ctrl+S] settings  [q] quit</Text>
          </Box>
        </Box>

        {/* Messages area */}
        <Box flexDirection="column" flexGrow={1} paddingX={1} paddingTop={1} overflowY="hidden">
          {chat.messages.length === 0 ? (
            <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
              <Text bold color="yellow">⚔  Multi-Model Arena</Text>
              <Text dimColor>Type a question and press Enter to start a debate</Text>
              <Text dimColor>Press [N] to select models first</Text>
            </Box>
          ) : (
            chat.messages.map((msg) => {
              if (msg.role === "summary") {
                return (
                  <SummaryBox
                    key={msg.id}
                    content={msg.content}
                    streaming={msg.streaming}
                  />
                );
              }
              return (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  modelId={msg.modelId}
                  modelName={msg.modelName}
                  content={msg.content}
                  error={msg.error}
                  streaming={msg.streaming}
                />
              );
            })
          )}
        </Box>

        {/* ControlBar - only show when there's a conversation */}
        {hasConversation && (
          <ControlBar
            round={chat.round}
            maxRounds={maxRounds}
            streamingProgress={streamingProgressText}
            isResponding={isResponding}
          />
        )}

        {/* InputBar */}
        <InputBar
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleInputSubmitWithModels}
          disabled={isResponding}
          placeholder={inputPlaceholder}
          focused={focusPanel === "chat"}
        />
      </Box>
    </Box>
  );
}
