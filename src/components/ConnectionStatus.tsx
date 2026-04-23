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

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`}
        aria-label={online ? "Online" : "Offline"}
      />
      {!online && <span className="text-xs text-red-600 font-medium">Offline</span>}
    </div>
  );
}
