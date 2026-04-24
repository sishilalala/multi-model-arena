import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getAllModels } from "../../lib/models.js";
import { readConfig } from "../../lib/config.js";
import { getModelColor } from "../theme.js";

interface ModelPickerProps {
  initialSelected: string[];
  maxModels: number;
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}

export function ModelPicker({
  initialSelected,
  maxModels,
  onConfirm,
  onCancel,
}: ModelPickerProps): React.ReactElement {
  const config = readConfig();
  const models = getAllModels(config.customModels);

  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected)
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setCursor((prev) => Math.min(models.length - 1, prev + 1));
    } else if (input === " ") {
      const model = models[cursor];
      if (!model) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(model.id)) {
          next.delete(model.id);
        } else {
          if (next.size < maxModels) {
            next.add(model.id);
          }
        }
        return next;
      });
    } else if (key.return) {
      if (selected.size >= 1) {
        onConfirm(Array.from(selected));
      }
    } else if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      alignSelf="center"
    >
      {/* Title */}
      <Box marginBottom={1} justifyContent="center">
        <Text bold color="cyan">
          Select Models ({selected.size}/{maxModels})
        </Text>
      </Box>

      {/* Model list */}
      {models.map((model, idx) => {
        const isSelected = selected.has(model.id);
        const isCursor = idx === cursor;
        const color = getModelColor(model.id, model.color);
        const checkbox = isSelected ? "[x]" : "[ ]";

        return (
          <Box key={model.id}>
            {isCursor ? (
              <Text inverse>
                {checkbox}{" "}
                <Text color={color}>{model.name}</Text>{" "}
                <Text dimColor>({model.providerId})</Text>
              </Text>
            ) : (
              <Text>
                <Text color={isSelected ? "white" : "gray"}>{checkbox}</Text>{" "}
                <Text color={color}>{model.name}</Text>{" "}
                <Text dimColor>({model.providerId})</Text>
              </Text>
            )}
          </Box>
        );
      })}

      {/* Instructions */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Space to toggle · Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  );
}
