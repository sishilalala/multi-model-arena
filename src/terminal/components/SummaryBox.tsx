import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { COLORS } from "../theme.js";

interface SummaryBoxProps {
  content: string;
  moderatorName?: string;
  streaming?: boolean;
}

export function SummaryBox({
  content,
  moderatorName,
  streaming,
}: SummaryBoxProps): React.ReactElement {
  const gold = COLORS.summaryBorder;
  const headerLabel = moderatorName
    ? `✦ SUMMARY by ${moderatorName}`
    : "✦ SUMMARY";

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={gold}
      paddingX={1}
      marginBottom={1}
    >
      <Box marginBottom={1}>
        <Text bold color={gold}>
          {headerLabel}
        </Text>
        {streaming && (
          <Text color={gold}>
            {" "}
            <Spinner type="dots" />
          </Text>
        )}
      </Box>
      <Text wrap="wrap">{content}</Text>
      {!streaming && (
        <Box marginTop={1}>
          <Text dimColor>[C] Copy to clipboard</Text>
        </Box>
      )}
    </Box>
  );
}
