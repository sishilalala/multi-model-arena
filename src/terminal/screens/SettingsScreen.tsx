import React from "react";
import { Box, Text, useInput } from "ink";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  useInput((input, key) => { if (key.escape) onBack(); });
  return <Box><Text>Settings placeholder (Esc to go back)</Text></Box>;
}
