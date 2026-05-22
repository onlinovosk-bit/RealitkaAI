"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import { WORKDESK_INPUT } from "@/lib/slate-horizon-theme";

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
        background: SLATE_HORIZON.soft,
        border: `1px solid ${SLATE_HORIZON.softBorder}`,
      }}
    >
      <div className="flex -space-x-1.5">
        {["RK", "MS", "AB"].map((initials) => (
          <div
            key={initials}
            className="flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-bold"
            style={{
              background: "#DBEAFE",
              borderColor: "#BFDBFE",
              color: SLATE_HORIZON.brandDeep,
            }}
          >
            {initials}
          </div>
        ))}
      </div>
      <span className="text-[11px] font-medium" style={{ color: SLATE_HORIZON.deep }}>
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
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: SLATE_HORIZON.green }} />
          <span className="text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
            {item}
          </span>
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
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-3" role="status">
        <p className="text-sm font-medium text-white">Skvelé! Presmerovávam vás...</p>
        <p className="text-xs text-white/70">Nastavenie trvá 2 minúty.</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-2 flex gap-2">
        <label htmlFor="hero-email" className="sr-only">
          Váš pracovný email
        </label>
        <input
          id="hero-email"
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
          className={`min-w-0 flex-1 px-4 py-3 text-sm outline-none transition-all duration-200 disabled:opacity-50 ${SLATE_HORIZON.focusRing}`}
          style={{
            borderRadius: WORKDESK_INPUT.borderRadius,
            border: `1px solid rgba(255,255,255,0.28)`,
            background: "rgba(255,255,255,0.14)",
            color: "#FFFFFF",
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "loading"}
          className={`flex min-h-[44px] flex-shrink-0 cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${SLATE_HORIZON.focusRing}`}
          style={{ background: SLATE_HORIZON.ctaGradient }}
        >
          {status === "loading" ? "Čakajte..." : "Začať →"}
        </button>
      </div>

      <AnimatePresence>
        {status === "error" && errorMsg && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-1 text-xs text-red-200"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="text-xs text-white/65">
        alebo{" "}
        <a
          href="/demo"
          className="cursor-pointer underline underline-offset-2 transition-colors duration-200 hover:text-white"
        >
          pozrite živé demo
        </a>{" "}
        · Odoslaním súhlasíte s{" "}
        <a
          href="/privacy"
          className="cursor-pointer underline underline-offset-2 transition-colors duration-200 hover:text-white/90"
        >
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
