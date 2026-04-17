"use client";

import { useEffect, useState } from "react";
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
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500";
  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 placeholder:text-gray-400";
  const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400";

  return (
    <div className="space-y-4">
      {/* Štýl a dĺžka */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Štýl odpovedí</h2>
        <p className="mt-1 text-sm text-gray-500">
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
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.includeSubject}
              onChange={(e) => save({ ...settings, includeSubject: e.target.checked })}
            />
            Pri email návrhoch pridať aj riadok „Predmet"
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.includeCta}
              onChange={(e) => save({ ...settings, includeCta: e.target.checked })}
            />
            Vždy pridať konkrétny ďalší krok pre makléra
          </label>
        </div>
      </div>

      {/* Tykanie / Vykanie */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Oslovenie</h2>
        <p className="mt-1 text-sm text-gray-500">Akú formu oslovenia má {AI_ASSISTANT_NAME} používať v odpovediach.</p>
        <div className="mt-4 flex gap-3">
          {(["vykanie", "tykanie"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => save({ ...settings, formality: opt })}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
              style={
                settings.formality === opt
                  ? { background: "#6366f1", color: "#fff" }
                  : { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }
              }
            >
              {opt === "vykanie" ? "Vykanie (Vy/Váš)" : "Tykanie (ty/tvoj)"}
            </button>
          ))}
        </div>
      </div>

      {/* Predvoľby výstupu */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Predvoľba výstupu</h2>
        <p className="mt-1 text-sm text-gray-500">Pre aký kanál má {AI_ASSISTANT_NAME} primárne formátovať odpovede.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {([
            { key: "email" as const, label: "✉ Email", desc: "Plný email s predmetom" },
            { key: "sms" as const, label: "💬 SMS", desc: "Krátka správa do 160 znakov" },
            { key: "call" as const, label: "📞 Telefonát", desc: "Osnova hovoru s bodmi" },
          ]).map((ch) => (
            <button
              key={ch.key}
              type="button"
              onClick={() => save({ ...settings, outputChannel: ch.key })}
              className="flex flex-col items-start rounded-xl px-5 py-3 text-left transition-all"
              style={
                settings.outputChannel === ch.key
                  ? {
                      background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                    }
                  : { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }
              }
            >
              <span className="text-sm font-semibold">{ch.label}</span>
              <span
                className="mt-0.5 text-xs"
                style={{ opacity: settings.outputChannel === ch.key ? 0.85 : 0.6 }}
              >
                {ch.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Firemný podpis */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Firemný podpis</h2>
        <p className="mt-1 text-sm text-gray-500">
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
          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-400">Náhľad podpisu:</p>
            <p className="mt-1 text-sm text-gray-700">
              {[settings.signatureName, settings.signatureCompany, settings.signaturePhone]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>
        )}
      </div>

      <p className={`text-xs ${saved ? "text-emerald-600" : "text-gray-400"}`}>
        {saved ? "✓ Nastavenie uložené." : "Nastavenie sa ukladá automaticky."}
      </p>
    </div>
  );
}
