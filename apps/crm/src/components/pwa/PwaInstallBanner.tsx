"use client";

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "revolis_pwa_install_dismissed";

export function PwaInstallBanner() {
  const { isInstallable, isInstalled, isIos, isIosStandalone, install } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) setDismissed(false);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const showAndroid = isInstallable && !isInstalled && !dismissed;
  const showIos = isIos && !isIosStandalone && !dismissed;

  if (!showAndroid && !showIos) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border p-4 shadow-2xl md:left-auto md:right-6 md:w-80"
      style={{
        background: "rgba(8,13,26,0.97)",
        borderColor: "rgba(34,211,238,0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
          style={{ background: "#0A1628", color: "#22D3EE" }}
        >
          R
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#F0F9FF" }}>
            Nainštalovať Revolis.AI
          </p>
          {showIos ? (
            <p className="mt-0.5 text-xs" style={{ color: "#64748B" }}>
              Klepnite na <span style={{ color: "#22D3EE" }}>Zdieľať</span> → „Pridať na plochu"
            </p>
          ) : (
            <p className="mt-0.5 text-xs" style={{ color: "#64748B" }}>
              Rýchly prístup z plochy — funguje offline
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-xs"
          style={{ color: "#475569" }}
          aria-label="Zavrieť"
        >
          ✕
        </button>
      </div>

      {showAndroid && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void install().then((ok) => ok && dismiss())}
            className="flex-1 rounded-xl py-2 text-sm font-semibold transition-all"
            style={{
              background: "rgba(34,211,238,0.12)",
              border: "1px solid rgba(34,211,238,0.3)",
              color: "#22D3EE",
            }}
          >
            Inštalovať
          </button>
          <button
            onClick={dismiss}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ color: "#475569" }}
          >
            Neskôr
          </button>
        </div>
      )}
    </div>
  );
}
