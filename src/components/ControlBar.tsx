"use client";

import type { ModelInfo } from "@/lib/models";
import { Button } from "./ui/Button";
import { ModelSelector } from "./ModelSelector";

const MAX_ROUNDS = 10;

interface ControlBarProps {
  round: number;
  estimatedCost: number;
  conversationCost: number;
  allModels: ModelInfo[];
  selectedModelIds: string[];
  onKeepDebating: () => void;
  onSummarize: () => void;
  onModelsChange: (ids: string[]) => void;
  isResponding?: boolean;
}

export function ControlBar({
  round,
  estimatedCost,
  conversationCost,
  allModels,
  selectedModelIds,
  onKeepDebating,
  onSummarize,
  onModelsChange,
  isResponding = false,
}: ControlBarProps) {
  const atMaxRounds = round >= MAX_ROUNDS;
  const highCost = conversationCost >= 1;

  return (
    <div className="border-t border-b border-gray-200 bg-gray-50 px-4 py-3 flex flex-col gap-3">
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

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="font-medium">
            Round {round} of {MAX_ROUNDS}
          </span>
          <span className="text-gray-400 text-xs">
            ~${estimatedCost.toFixed(4)} / round
          </span>
        </div>
      </div>

      {/* Cost warning */}
      {highCost && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
          Conversation cost: ${conversationCost.toFixed(4)} — this conversation has exceeded $1.
        </div>
      )}

      {/* Model selector */}
      <ModelSelector
        allModels={allModels}
        selectedIds={selectedModelIds}
        onChange={onModelsChange}
      />
    </div>
  );
}
