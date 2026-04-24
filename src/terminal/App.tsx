import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { getApiKey } from "../lib/keychain.js";
import { SetupScreen } from "./screens/SetupScreen.js";
import { ChatScreen } from "./screens/ChatScreen.js";
import { SettingsScreen } from "./screens/SettingsScreen.js";

type Screen = "loading" | "setup" | "chat" | "settings";

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const { exit } = useApp();

  useEffect(() => {
    getApiKey("openrouter")
      .then((key) => {
        if (key) {
          setScreen("chat");
        } else {
          setScreen("setup");
        }
      })
      .catch(() => {
        setScreen("setup");
      });
  }, []);

  if (screen === "loading") {
    return (
      <Box>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  if (screen === "setup") {
    return (
      <SetupScreen
        onComplete={() => setScreen("chat")}
        onQuit={() => exit()}
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        onBack={() => setScreen("chat")}
      />
    );
  }

  // screen === "chat"
  return (
    <ChatScreen
      onOpenSettings={() => setScreen("settings")}
      onQuit={() => exit()}
    />
  );
}
