import React from "react";
import { Box, Text } from "ink";

interface ChatScreenProps {
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function ChatScreen({ onOpenSettings, onQuit }: ChatScreenProps) {
  return <Box><Text>Chat placeholder</Text></Box>;
}
