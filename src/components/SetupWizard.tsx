"use client";

import { useState, FormEvent } from "react";
import { Button } from "./ui/Button";

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: "openrouter", apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `Request failed (${res.status})`
        );
      }

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save API key. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#FAF9F6] rounded-2xl shadow-2xl border border-[#E8E0D8] p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FAE8D4] flex items-center justify-center text-2xl mx-auto shadow-sm">
            ⚔️
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Multi-Model Arena</h1>
          <p className="text-sm text-[#8B7E74] leading-relaxed">
            Watch multiple AI models debate each other on any topic. Enter your
            OpenRouter API key to get started — all models are accessed through
            a single key.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="api-key"
              className="text-sm font-medium text-[#5C4F46]"
            >
              OpenRouter API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="border border-[#E8E0D8] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C96A2E] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed font-mono text-[#1a1a1a] placeholder-[#B0A49A]"
              disabled={loading}
            />
          </div>

          {/* Error state */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !apiKey.trim()}
            className="w-full rounded-xl"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving…
              </span>
            ) : (
              "Get Started"
            )}
          </Button>
        </form>

        {/* Privacy note */}
        <p className="text-xs text-[#B0A49A] text-center leading-relaxed">
          Your API key is stored securely in your system keychain and never
          leaves your machine. It is only used to make requests to OpenRouter
          on your behalf.
        </p>
      </div>
    </div>
  );
}
