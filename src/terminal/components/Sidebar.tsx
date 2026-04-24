import React from "react";
import { Box, Text, useInput } from "ink";
import type { ConversationMeta } from "../../lib/conversations.js";

interface SidebarProps {
  conversations: ConversationMeta[];
  selectedIndex: number;
  activeConversationId: string | null;
  focused: boolean;
  onSelect: (id: string) => void;
  onSelectedIndexChange: (index: number) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

const SIDEBAR_WIDTH = 22;
const MAX_VISIBLE = 20;

export function Sidebar({
  conversations,
  selectedIndex,
  activeConversationId,
  focused,
  onSelect,
  onSelectedIndexChange,
  onNew,
  onDelete,
  onOpenSettings,
}: SidebarProps): React.ReactElement {
  const visible = conversations.slice(0, MAX_VISIBLE);

  useInput(
    (input, key) => {
      if (key.upArrow) {
        onSelectedIndexChange(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        onSelectedIndexChange(Math.min(visible.length - 1, selectedIndex + 1));
      } else if (key.return) {
        const conv = visible[selectedIndex];
        if (conv) onSelect(conv.id);
      } else if (key.delete || input === "x") {
        const conv = visible[selectedIndex];
        if (conv) onDelete(conv.id);
      }
    },
    { isActive: focused }
  );

  return (
    <Box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      borderStyle="single"
      borderColor="#444444"
      height="100%"
    >
      {/* Header */}
      <Box justifyContent="center" marginBottom={0}>
        <Text bold>─ History ─</Text>
      </Box>

      {/* Conversation list */}
      <Box flexDirection="column" flexGrow={1}>
        {visible.map((conv, idx) => {
          const isActive = conv.id === activeConversationId;
          const isCursor = focused && idx === selectedIndex;
          const maxTitleLen = SIDEBAR_WIDTH - 5; // room for prefix and border
          const title =
            conv.title.length > maxTitleLen
              ? conv.title.slice(0, maxTitleLen - 1) + "…"
              : conv.title;

          const prefix = isActive ? "▸ " : "  ";

          return (
            <Box key={conv.id}>
              {isCursor ? (
                <Text inverse bold={isActive}>
                  {prefix}
                  {title}
                </Text>
              ) : (
                <Text bold={isActive} color={isActive ? "yellow" : undefined}>
                  {prefix}
                  {title}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box justifyContent="space-between" marginTop={0}>
        <Text dimColor>[S] Settings</Text>
        <Text dimColor>[N] New</Text>
      </Box>
    </Box>
  );
}
