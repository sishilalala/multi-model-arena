import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { getModelColor } from "../theme.js";

interface MessageBubbleProps {
  role: "user" | "assistant" | "summary";
  modelId?: string;
  modelName?: string;
  content: string;
  error?: string;
  streaming?: boolean;
}

export function MessageBubble({
  role,
  modelId,
  modelName,
  content,
  error,
  streaming,
}: MessageBubbleProps): React.ReactElement {
  if (role === "user") {
    return (
      <Box marginBottom={1}>
        <Text bold color="white">
          You:{" "}
        </Text>
        <Text color="white">{content}</Text>
      </Box>
    );
  }

  if (role === "summary") {
    // Summary messages are handled by SummaryBox, but fallback here just in case
    return (
      <Box marginBottom={1}>
        <Text>{content}</Text>
      </Box>
    );
  }

  // assistant role
  const color = modelId ? getModelColor(modelId) : "#888888";
  const displayName = modelName ?? modelId ?? "Unknown";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={color}>
          ● {displayName}
        </Text>
        {streaming && (
          <Text color={color}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>
      {error ? (
        <Box marginLeft={2}>
          <Text dimColor>did not respond </Text>
          <Text dimColor>[R]etry</Text>
        </Box>
      ) : streaming && !content ? (
        <Box marginLeft={2}>
          <Text dimColor italic>Thinking...</Text>
        </Box>
      ) : (
        <Box marginLeft={2}>
          <Text wrap="wrap">{content}</Text>
        </Box>
      )}
    </Box>
  );
}
