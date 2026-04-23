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
        body: JSON.stringify({ key: apiKey.trim() }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2 text-center">
          <div className="text-4xl mb-1">⚔️</div>
          <h1 className="text-2xl font-bold text-gray-900">Multi-Model Arena</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
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
              className="text-sm font-medium text-gray-700"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              disabled={loading}
            />
          </div>

          {/* Error state */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading || !apiKey.trim()}
            className="w-full"
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
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Your API key is stored securely in your system keychain and never
          leaves your machine. It is only used to make requests to OpenRouter
          on your behalf.
        </p>
      </div>
    </div>
  );
}
