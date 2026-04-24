import React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement {
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          {title}
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>{message}</Text>
      </Box>
      <Box>
        <Text bold color="green">
          [Y] Yes{" "}
        </Text>
        <Text bold color="red">
          [N] No
        </Text>
      </Box>
    </Box>
  );
}
