import React from "react";
import { Box, Text } from "ink";

interface ControlBarProps {
  round: number;
  maxRounds: number;
  streamingProgress: string;
  isResponding: boolean;
}

export function ControlBar({
  round,
  maxRounds,
  streamingProgress,
  isResponding,
}: ControlBarProps): React.ReactElement {
  const showDebate = round < maxRounds;

  return (
    <Box borderStyle="single" borderColor="#444444" paddingX={1}>
      {/* Left side controls */}
      <Box flexGrow={1}>
        {showDebate && (
          <Text color={isResponding ? undefined : "green"} dimColor={isResponding}>
            [D]ebate{" "}
          </Text>
        )}
        <Text color={isResponding ? undefined : "yellow"} dimColor={isResponding}>
          [S]ummarize{" "}
        </Text>
        <Text color={isResponding ? undefined : "cyan"} dimColor={isResponding}>
          [M]odels
        </Text>
      </Box>

      {/* Right side: streaming progress + round info */}
      <Box>
        {streamingProgress ? (
          <Text dimColor>{streamingProgress} </Text>
        ) : null}
        <Text dimColor>
          Round {round}/{maxRounds}
        </Text>
      </Box>
    </Box>
  );
}
