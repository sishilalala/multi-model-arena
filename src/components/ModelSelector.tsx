"use client";

import type { ModelInfo } from "@/lib/models";

const MAX_MODELS = 8;

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
                ? "bg-[#3D2B1F] text-white border-[#3D2B1F]"
                : "bg-white text-[#5C4F46] border-[#E8E0D8] hover:border-[#C9A88A] hover:bg-[#FAF0E8]"
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
