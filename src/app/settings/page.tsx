"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AppConfig } from "@/lib/config";
import { DEFAULT_MODELS } from "@/lib/models";
import { Button } from "@/components/ui/Button";

const MAX_MODELS = 6;

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  // Danger zone state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearInput, setClearInput] = useState("");
  const [clearError, setClearError] = useState<string | null>(null);

  // Provider key state
  const [providerKey, setProviderKey] = useState("");
  const [keyMsg, setKeyMsg] = useState<string | null>(null);

  // ─── Load config ────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data: AppConfig = await res.json();
          setConfig(data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Save helper ─────────────────────────────────────────────────────────

  const save = useCallback(
    async (patch: Partial<AppConfig>) => {
      if (!config) return;
      const updated = { ...config, ...patch };
      setConfig(updated);
      setSaving(true);
      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [config]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleDefaultModel(id: string) {
    if (!config) return;
    const current = config.defaultModels;
    const isSelected = current.includes(id);
    let next: string[];
    if (isSelected) {
      next = current.filter((m) => m !== id);
    } else if (current.length < MAX_MODELS) {
      next = [...current, id];
    } else {
      return; // at max
    }
    save({ defaultModels: next });
  }

  async function handleSaveApiKey() {
    if (!providerKey.trim()) return;
    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: "openrouter", apiKey: providerKey.trim() }),
      });
      if (res.ok) {
        setKeyMsg("Key saved successfully.");
        setProviderKey("");
      } else {
        const data = await res.json().catch(() => ({}));
        setKeyMsg((data as { error?: string }).error ?? "Failed to save key.");
      }
    } catch {
      setKeyMsg("Failed to save key.");
    }
    setTimeout(() => setKeyMsg(null), 3000);
  }

  async function handleClearAll() {
    if (clearInput !== "DELETE ALL") {
      setClearError('Please type "DELETE ALL" to confirm.');
      return;
    }
    setClearError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true, confirmation: "DELETE ALL" }),
      });
      if (res.ok) {
        setShowClearDialog(false);
        setClearInput("");
      } else {
        const data = await res.json().catch(() => ({}));
        setClearError((data as { error?: string }).error ?? "Failed to clear history.");
      }
    } catch {
      setClearError("Failed to clear history.");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-50">
        <svg
          className="animate-spin w-8 h-8 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-600">Failed to load settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Back to Chat
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-semibold text-gray-900">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-gray-400">Saving…</span>
            )}
            {savedMsg && (
              <span className="text-xs text-green-600 font-medium">Saved</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* API Providers */}
        <SectionCard title="API Providers">
          {config.providers.map((provider) => (
            <div key={provider.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                  <p className="text-xs text-gray-400">{provider.baseUrl}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={providerKey}
                  onChange={(e) => setProviderKey(e.target.value)}
                  placeholder="sk-or-… (leave blank to keep current)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button variant="secondary" size="sm" onClick={handleSaveApiKey} disabled={!providerKey.trim()}>
                  Update Key
                </Button>
              </div>
              {keyMsg && (
                <p className="text-xs text-green-700">{keyMsg}</p>
              )}
            </div>
          ))}
        </SectionCard>

        {/* Default Models */}
        <SectionCard title="Default Models">
          <p className="text-sm text-gray-500">
            Select up to {MAX_MODELS} models to use by default in new conversations.
          </p>
          <div className="flex flex-col gap-2">
            {DEFAULT_MODELS.map((model) => {
              const selected = config.defaultModels.includes(model.id);
              const atMax = !selected && config.defaultModels.length >= MAX_MODELS;
              return (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selected
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${atMax ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={atMax}
                    onChange={() => toggleDefaultModel(model.id)}
                    className="sr-only"
                  />
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="text-sm text-gray-800 flex-1">{model.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{model.id}</span>
                  {selected && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600 flex-shrink-0">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
              );
            })}
          </div>
        </SectionCard>

        {/* Moderator Model */}
        <SectionCard title="Moderator Model">
          <p className="text-sm text-gray-500">
            The model used to generate debate summaries.
          </p>
          <select
            value={config.moderatorModel}
            onChange={(e) => save({ moderatorModel: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DEFAULT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </SectionCard>

        {/* Debate Style */}
        <SectionCard title="Debate Style">
          <p className="text-sm text-gray-500">
            Controls how models respond to each other.
          </p>
          <div className="flex gap-2">
            {(["collaborative", "adversarial"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => save({ debateStyle: style })}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  config.debateStyle === style
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            {config.debateStyle === "collaborative"
              ? "Models build on each other's ideas and seek common ground."
              : "Models challenge and critique each other's positions."}
          </p>
        </SectionCard>

        {/* Temperature */}
        <SectionCard title="Temperature">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Focused</span>
            <span className="font-medium text-gray-800">{config.temperature.toFixed(1)}</span>
            <span>Creative</span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={config.temperature}
            onChange={(e) => save({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </SectionCard>

        {/* Monthly Spending Limit */}
        <SectionCard title="Monthly Spending Limit">
          <p className="text-sm text-gray-500">
            Conversations will be blocked once this limit is reached.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={config.monthlySpendingLimit}
              onChange={(e) =>
                save({ monthlySpendingLimit: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">/ month</span>
          </div>
        </SectionCard>

        {/* Conversation Memory */}
        <SectionCard title="Conversation Memory">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Memory</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Models can reference context from previous conversations via a shared memory file.
              </p>
            </div>
            <Toggle
              checked={config.memoryEnabled}
              onChange={(val) => save({ memoryEnabled: val })}
              label="Toggle conversation memory"
            />
          </div>
        </SectionCard>

        {/* Conversations Folder */}
        <SectionCard title="Conversations Folder">
          <p className="text-sm text-gray-500">
            Where conversation markdown files are stored on disk.
          </p>
          <input
            type="text"
            value={config.conversationsFolder}
            onChange={(e) => save({ conversationsFolder: e.target.value })}
            placeholder="/path/to/folder"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </SectionCard>

        {/* Danger Zone */}
        <SectionCard title="Danger Zone">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Clear All History</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently delete all conversation files. This cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setClearInput("");
                setClearError(null);
                setShowClearDialog(true);
              }}
            >
              Clear History
            </Button>
          </div>
        </SectionCard>
      </main>

      {/* Clear all dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Clear All History</h2>
            <p className="text-sm text-gray-600">
              This will permanently delete all conversation files. Type{" "}
              <span className="font-mono font-bold text-red-600">DELETE ALL</span> to confirm.
            </p>
            <input
              type="text"
              value={clearInput}
              onChange={(e) => {
                setClearInput(e.target.value);
                setClearError(null);
              }}
              placeholder="DELETE ALL"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {clearError && (
              <p className="text-sm text-red-600">{clearError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowClearDialog(false);
                  setClearInput("");
                  setClearError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearAll}
                disabled={clearInput !== "DELETE ALL"}
              >
                Delete All
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
