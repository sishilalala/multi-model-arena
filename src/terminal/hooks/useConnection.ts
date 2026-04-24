import { useState, useEffect, useRef } from "react";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

async function checkOnline(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      method: "HEAD",
      signal: controller.signal,
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface UseConnectionReturn {
  online: boolean;
}

export function useConnection(): UseConnectionReturn {
  const [online, setOnline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      const isOnline = await checkOnline();
      if (!cancelled) {
        setOnline(isOnline);
      }
      if (!cancelled) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    // Initial check
    poll();

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { online };
}
