import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { COLORS } from "../theme.js";

interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  focused?: boolean;
}

export function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  focused,
}: InputBarProps): React.ReactElement {
  const borderColor = focused ? COLORS.inputFocusBorder : COLORS.inputBorder;

  return (
    <Box borderStyle="single" borderColor={borderColor} paddingX={1}>
      <Text bold>❯ </Text>
      {disabled ? (
        <Text dimColor>{placeholder ?? ""}</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          focus={focused}
        />
      )}
    </Box>
  );
}
