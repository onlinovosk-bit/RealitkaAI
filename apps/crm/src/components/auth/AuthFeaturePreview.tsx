"use client";

import { useEffect, useState } from "react";
import { AI_ASSISTANT_STATUS_ACTIVE } from "@/lib/ai-brand";
import { AUTH_PAGE } from "@/lib/auth-page-theme";
import { AUTH_PREVIEW_PULSE, AUTH_PREVIEW_TILES } from "@/lib/auth-preview-features";

export default function AuthFeaturePreview() {
  const [toastIdx, setToastIdx] = useState(0);
  const secondaryToastIdx = (toastIdx + AUTH_PREVIEW_PULSE.length - 1) % AUTH_PREVIEW_PULSE.length;

  useEffect(() => {
    const id = window.setInterval(() => {
      setToastIdx((prev) => (prev + 1) % AUTH_PREVIEW_PULSE.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="rounded-3xl border bg-white/80 p-6 backdrop-blur-sm"
      style={{ borderColor: AUTH_PAGE.cardBorder, boxShadow: AUTH_PAGE.cardShadow }}
    >
      <p className="text-xs uppercase tracking-[0.18em]" style={{ color: AUTH_PAGE.brand }}>
        Workdesk Preview
      </p>
      <h2 className="mt-2 text-xl font-semibold" style={{ color: AUTH_PAGE.ink }}>
        Čo máte po prihlásení
      </h2>
      <p className="mt-2 text-sm" style={{ color: AUTH_PAGE.deep }}>
        Texty inzerátov, priorita dopytov, návrh odpovede na schválenie, ranný brief, odhad ceny a
        spätná väzba z hovorov.
      </p>

      <div
        className="mt-5 rounded-2xl border p-4"
        style={{
          borderColor: AUTH_PAGE.cardBorder,
          background: AUTH_PAGE.panelBackground,
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full motion-reduce:animate-none animate-pulse"
              style={{ background: AUTH_PAGE.green }}
            />
            <span className="text-xs font-medium" style={{ color: AUTH_PAGE.deep }}>
              {AI_ASSISTANT_STATUS_ACTIVE}
            </span>
          </div>
          <span className="text-xs" style={{ color: AUTH_PAGE.muted }}>
            Funkcie v aplikácii
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {AUTH_PREVIEW_TILES.map((tile) => (
            <div
              key={tile.id}
              className="rounded-xl border bg-white p-3 shadow-sm"
              style={{ borderColor: AUTH_PAGE.cardBorder }}
            >
              <p className="text-[11px]" style={{ color: AUTH_PAGE.muted }}>
                {tile.title}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug" style={{ color: AUTH_PAGE.ink }}>
                {tile.outcome}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-4 rounded-2xl border bg-white p-3"
        style={{ borderColor: AUTH_PAGE.line }}
      >
        <p className="text-[11px] uppercase tracking-[0.15em]" style={{ color: AUTH_PAGE.brandDeep }}>
          Čo v aplikácii nájdete
        </p>
        <div className="mt-2 space-y-2">
          <div
            className="flex items-start gap-2 rounded-xl border p-2"
            style={{ borderColor: AUTH_PAGE.line, background: AUTH_PAGE.soft }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full"
              style={{ background: AUTH_PAGE.green }}
            />
            <p key={toastIdx} className="text-xs" style={{ color: AUTH_PAGE.ink }}>
              {AUTH_PREVIEW_PULSE[toastIdx].outcome}
            </p>
          </div>
          <div
            className="flex items-start gap-2 rounded-xl border p-2 opacity-90"
            style={{ borderColor: AUTH_PAGE.line, background: AUTH_PAGE.soft }}
          >
            <span
              className="mt-1 h-2 w-2 rounded-full"
              style={{ background: AUTH_PAGE.brand2 }}
            />
            <p key={secondaryToastIdx} className="text-xs" style={{ color: AUTH_PAGE.deep }}>
              {AUTH_PREVIEW_PULSE[secondaryToastIdx].outcome}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
