"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (mounted) setOnline(res.ok);
      } catch {
        if (mounted) setOnline(false);
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (online) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
          aria-label="Online"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-red-400"
        aria-label="Offline"
      />
      <span className="text-xs text-red-500 font-medium">Offline</span>
    </div>
  );
}
