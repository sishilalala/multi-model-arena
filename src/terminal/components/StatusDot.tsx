import React from "react";
import { Text } from "ink";

interface StatusDotProps {
  online: boolean;
}

export function StatusDot({ online }: StatusDotProps): React.ReactElement {
  if (online) {
    return <Text color="green">●</Text>;
  }
  return <Text color="red">● OFFLINE</Text>;
}
