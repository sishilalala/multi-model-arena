"use client";

import type { ModelInfo } from "@/lib/models";

const MAX_MODELS = 6;

interface ModelSelectorProps {
  allModels: ModelInfo[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  maxModels?: number;
}

export function ModelSelector({
  allModels,
  selectedIds,
  onChange,
  maxModels = MAX_MODELS,
}: ModelSelectorProps) {
  function toggle(id: string) {
    const isSelected = selectedIds.includes(id);
    if (isSelected) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (selectedIds.length < maxModels) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allModels.map((model) => {
        const selected = selectedIds.includes(model.id);
        const atMax = !selected && selectedIds.length >= maxModels;
        return (
          <button
            key={model.id}
            onClick={() => toggle(model.id)}
            disabled={atMax}
            title={atMax ? `Max ${maxModels} models selected` : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              selected
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: model.color }}
            />
            {model.name}
          </button>
        );
      })}
    </div>
  );
}
