import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { setApiKey } from "../../lib/keychain.js";

interface SetupScreenProps {
  onComplete: () => void;
  onQuit: () => void;
}

type Status = "idle" | "saving" | "error";

export function SetupScreen({ onComplete, onQuit }: SetupScreenProps) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { exit } = useApp();

  useInput((input, inkKey) => {
    if (inkKey.escape || (input === "q" && key === "")) {
      onQuit();
      exit();
    }
  });

  async function handleSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    setStatus("saving");
    try {
      await setApiKey("openrouter", trimmed);
      onComplete();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save key");
      setStatus("error");
    }
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
    >
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        paddingX={4}
        paddingY={1}
        width={60}
      >
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="yellow">
            ⚔  Multi-Model Arena
          </Text>
        </Box>

        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>Enter your OpenRouter API key to get started</Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor>API Key: </Text>
          {status === "saving" ? (
            <Text dimColor>Saving...</Text>
          ) : (
            <TextInput
              value={key}
              onChange={setKey}
              onSubmit={handleSubmit}
              mask="●"
              placeholder="sk-or-..."
            />
          )}
        </Box>

        {status === "error" && (
          <Box>
            <Text color="red">{errorMsg}</Text>
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>Press Enter to save · Esc or q (empty) to quit</Text>
        </Box>
      </Box>
    </Box>
  );
}
