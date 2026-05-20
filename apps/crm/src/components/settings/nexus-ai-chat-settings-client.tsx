"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail, MessageSquare, Phone } from "lucide-react";
import {
  DEFAULT_NEXUS_CHAT_SETTINGS,
  NEXUS_CHAT_SETTINGS_STORAGE_KEY,
  type NexusChatSettings,
} from "@/lib/nexus-chat-settings";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

export default function NexusAiChatSettingsClient() {
  const [settings, setSettings] = useState<NexusChatSettings>(DEFAULT_NEXUS_CHAT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NEXUS_CHAT_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NexusChatSettings>;
      setSettings((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
  }, []);

  function save(next: NexusChatSettings) {
    setSettings(next);
    localStorage.setItem(NEXUS_CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const selectCls =
    "w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const inputCls =
    "w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
  const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-4">
      {/* Štýl a dĺžka */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Štýl odpovedí</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Nastavenia sa použijú v detaile príležitosti pri {AI_ASSISTANT_NAME}.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className={labelCls}>Tón odpovede</span>
            <select
              value={settings.replyStyle}
              onChange={(e) => save({ ...settings, replyStyle: e.target.value as NexusChatSettings["replyStyle"] })}
              className={selectCls}
            >
              <option value="professional">Profesionálny</option>
              <option value="friendly">Priateľský</option>
              <option value="concise">Ultra stručný</option>
              <option value="sales">Predajný (akčný)</option>
            </select>
          </label>

          <label className="text-sm">
            <span className={labelCls}>Dĺžka odpovede</span>
            <select
              value={settings.replyLength}
              onChange={(e) => save({ ...settings, replyLength: e.target.value as NexusChatSettings["replyLength"] })}
              className={selectCls}
            >
              <option value="short">Krátka</option>
              <option value="medium">Stredná</option>
              <option value="detailed">Detailná</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings.includeSubject}
              onChange={(e) => save({ ...settings, includeSubject: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Pri email návrhoch pridať aj riadok „Predmet"
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={settings.includeCta}
              onChange={(e) => save({ ...settings, includeCta: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Vždy pridať konkrétny ďalší krok pre makléra
          </label>
        </div>
      </div>

      {/* Tykanie / Vykanie */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Oslovenie</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Akú formu oslovenia má {AI_ASSISTANT_NAME} používať v odpovediach.</p>
        <div className="mt-4 flex gap-3">
          {(["vykanie", "tykanie"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => save({ ...settings, formality: opt })}
              className={`min-h-[44px] rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                settings.formality === opt
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              {opt === "vykanie" ? "Vykanie (Vy/Váš)" : "Tykanie (ty/tvoj)"}
            </button>
          ))}
        </div>
      </div>

      {/* Predvoľby výstupu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Predvoľba výstupu</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Pre aký kanál má {AI_ASSISTANT_NAME} primárne formátovať odpovede.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {([
            { key: "email" as const, label: "Email", desc: "Plný email s predmetom", icon: Mail },
            { key: "sms" as const, label: "SMS", desc: "Krátka správa do 160 znakov", icon: MessageSquare },
            { key: "call" as const, label: "Telefonát", desc: "Osnova hovoru s bodmi", icon: Phone },
          ]).map((ch) => (
            (() => {
              const Icon = ch.icon;
              const active = settings.outputChannel === ch.key;

              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => save({ ...settings, outputChannel: ch.key })}
                  className={`flex min-h-[72px] min-w-[10rem] flex-col items-start rounded-xl border px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    active
                      ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" aria-hidden />
                    {ch.label}
                  </span>
                  <span className={`mt-1 text-xs ${active ? "text-blue-50" : "text-slate-500"}`}>
                    {ch.desc}
                  </span>
                </button>
              );
            })()
          ))}
        </div>
      </div>

      {/* Firemný podpis */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Firemný podpis</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {AI_ASSISTANT_NAME} automaticky pridá podpis na koniec emailov a správ.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className={labelCls}>Meno makléra</span>
            <input
              type="text"
              value={settings.signatureName}
              onChange={(e) => save({ ...settings, signatureName: e.target.value })}
              placeholder="Ján Novák"
              className={inputCls}
            />
          </label>
          <label className="text-sm">
            <span className={labelCls}>Firma / Kancelária</span>
            <input
              type="text"
              value={settings.signatureCompany}
              onChange={(e) => save({ ...settings, signatureCompany: e.target.value })}
              placeholder="Reality Plus s.r.o."
              className={inputCls}
            />
          </label>
          <label className="text-sm">
            <span className={labelCls}>Telefón</span>
            <input
              type="text"
              value={settings.signaturePhone}
              onChange={(e) => save({ ...settings, signaturePhone: e.target.value })}
              placeholder="+421 9XX XXX XXX"
              className={inputCls}
            />
          </label>
        </div>
        {(settings.signatureName || settings.signatureCompany || settings.signaturePhone) && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Náhľad podpisu:</p>
            <p className="mt-1 text-sm text-slate-700">
              {[settings.signatureName, settings.signatureCompany, settings.signaturePhone]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>
        )}
      </div>

      <p className={`flex items-center gap-1 text-xs ${saved ? "text-emerald-700" : "text-slate-500"}`}>
        {saved && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
        {saved ? "Nastavenie uložené." : "Nastavenie sa ukladá automaticky."}
      </p>
    </div>
  );
}
