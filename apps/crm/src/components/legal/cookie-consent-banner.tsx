"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "revolis_cookie_consent_v1";

type ConsentMode = "all" | "necessary";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setVisible(!saved);
    } catch {
      setVisible(true);
    }
  }, []);

  const saveConsent = (mode: ConsentMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, timestamp: new Date().toISOString() }));
      window.dispatchEvent(new CustomEvent("revolis-cookie-consent", { detail: { mode } }));
    } catch {
      // no-op: fail safe, banner can still close
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur">
      <p className="text-sm leading-relaxed">
        Revolis.AI používa nevyhnutné cookies na bezpečnosť a fungovanie platformy. Voliteľné analytické cookies
        zapíname iba s vaším súhlasom. Viac v{" "}
        <Link href="/cookie-policy" className="underline text-cyan-300">
          Cookie Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => saveConsent("necessary")}
          className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
        >
          Len nevyhnutné
        </button>
        <button
          type="button"
          onClick={() => saveConsent("all")}
          className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Súhlasím so všetkými
        </button>
      </div>
    </div>
  );
}
