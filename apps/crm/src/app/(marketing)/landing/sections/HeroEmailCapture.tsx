"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const HERO_SUBHEADLINE =
  "Prvý obchod navyše zaplatí Revolis.AI na celý rok. Priemerná kancelária uzatvára o 28% viac obchodov - bez nových maklérov.";

export function HeroSocialProof() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: "rgba(34,211,238,0.08)",
        border: "1px solid rgba(34,211,238,0.18)",
      }}
    >
      <div className="flex -space-x-1.5">
        {["RK", "MS", "AB"].map((initials) => (
          <div
            key={initials}
            className="flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-bold"
            style={{
              background: "rgba(34,211,238,0.15)",
              borderColor: "rgba(34,211,238,0.25)",
              color: "#22D3EE",
            }}
          >
            {initials}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-medium text-cyan-400/80">
        13 kancelárií sa pridalo tento mesiac
      </span>
    </div>
  );
}

export function HeroTrustBar() {
  const items = [
    "Člen Realitnej únie SR",
    "30-dňová garancia vrátenia",
    "Zrušenie kedykoľvek",
    "GDPR · Slovenský server",
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
          <span className="text-[11px] text-slate-500">{item}</span>
        </div>
      ))}
    </div>
  );
}

export function HeroEmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!EMAIL_REGEX.test(email)) {
      setStatus("error");
      setErrorMsg("Zadajte platný emailový tvar.");
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/demo/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "hero_email_capture",
          gdprConsent: true,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Chyba servera.");
      }

      setStatus("success");
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "hero_email_captured", { source: "hero_email_capture" });
      }

      window.setTimeout(() => {
        window.location.href = `/register?email=${encodeURIComponent(email)}`;
      }, 900);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Skúste znovu.");
    }
  }, [email]);

  if (status === "success") {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-3">
        <p className="text-sm font-medium text-white">Skvelé! Presmerovávam vás...</p>
        <p className="text-xs text-slate-500">Nastavenie trvá 2 minúty.</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 flex gap-2">
        <input
          ref={inputRef}
          type="email"
          value={email}
          onFocus={() => {
            if (typeof window !== "undefined" && window.gtag) {
              window.gtag("event", "hero_email_focused");
            }
          }}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="vas@email.sk"
          disabled={status === "loading"}
          className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-150 focus:border-cyan-400/50 focus:bg-white/[0.08] disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={status === "loading"}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] transition-all duration-150 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ boxShadow: "0 0 20px rgba(34,211,238,0.35)" }}
        >
          {status === "loading" ? "Čakajte..." : "Začať ->"}
        </button>
      </div>

      <AnimatePresence>
        {status === "error" && errorMsg && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-1 text-xs text-red-400"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-xs text-slate-600">
        alebo{" "}
        <a
          href="/demo"
          className="text-slate-500 underline underline-offset-2 transition-colors hover:text-slate-400"
        >
          pozrite živé demo
        </a>{" "}
        · Odoslaním súhlasíte s{" "}
        <a
          href="/privacy"
          className="text-slate-600 underline underline-offset-2 transition-colors hover:text-slate-500"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
