"use client";

import type { ModelInfo } from "@/lib/models";
import { Button } from "./ui/Button";
import { ModelSelector } from "./ModelSelector";

const MAX_ROUNDS = 10;

interface ControlBarProps {
  round: number;
  allModels: ModelInfo[];
  selectedModelIds: string[];
  onKeepDebating: () => void;
  onSummarize: () => void;
  onModelsChange: (ids: string[]) => void;
  isResponding?: boolean;
}

export function ControlBar({
  round,
  allModels,
  selectedModelIds,
  onKeepDebating,
  onSummarize,
  onModelsChange,
  isResponding = false,
}: ControlBarProps) {
  const atMaxRounds = round >= MAX_ROUNDS;

  return (
    <div className="border-t border-b border-[#E8E0D8] bg-[#F5F0EB] px-4 py-3 flex flex-col gap-3">
      {/* Top row: actions + round info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onKeepDebating}
            disabled={atMaxRounds || isResponding}
            title={atMaxRounds ? "Maximum rounds reached" : undefined}
          >
            Keep Debating
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onSummarize}
            disabled={isResponding}
          >
            Summarize
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm text-[#8B7E74]">
          <span className="font-medium text-[#5C4F46]">
            Round {round} of {MAX_ROUNDS}
          </span>
        </div>
      </div>

      {/* Model selector */}
      <ModelSelector
        allModels={allModels}
        selectedIds={selectedModelIds}
        onChange={onModelsChange}
      />
    </div>
  );
}
