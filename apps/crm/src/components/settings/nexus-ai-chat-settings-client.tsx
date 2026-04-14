"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_NEXUS_CHAT_SETTINGS,
  NEXUS_CHAT_SETTINGS_STORAGE_KEY,
  type NexusChatSettings,
} from "@/lib/nexus-chat-settings";

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
      // ignore invalid local storage payload
    }
  }, []);

  function save(next: NexusChatSettings) {
    setSettings(next);
    localStorage.setItem(NEXUS_CHAT_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Štýl odpovedí NEXUS AI</h2>
        <p className="mt-1 text-sm text-gray-500">
          Nastavenia sa použijú v detaile príležitosti pri NEXUS AI Chate.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Tón odpovede</span>
            <select
              value={settings.replyStyle}
              onChange={(e) => save({ ...settings, replyStyle: e.target.value as NexusChatSettings["replyStyle"] })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
            >
              <option value="professional">Profesionálny</option>
              <option value="friendly">Priateľský</option>
              <option value="concise">Ultra stručný</option>
              <option value="sales">Predajný (akčný)</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Dĺžka odpovede</span>
            <select
              value={settings.replyLength}
              onChange={(e) => save({ ...settings, replyLength: e.target.value as NexusChatSettings["replyLength"] })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-500"
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
            Pri email návrhoch pridať aj riadok „Predmet“
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

        <p className={`mt-4 text-xs ${saved ? "text-emerald-600" : "text-gray-400"}`}>
          {saved ? "Nastavenie uložené." : "Nastavenie sa ukladá automaticky."}
        </p>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <h3 className="text-sm font-semibold text-indigo-900">Odporúčané ďalšie features</h3>
        <ul className="mt-2 space-y-1 text-sm text-indigo-800">
          <li>- Prepínač „Tykanie/Vykanie“</li>
          <li>- Predvoľby pre „SMS/Email/Telefonát“ výstup</li>
          <li>- Firemný podpis (meno, firma, telefón) ako šablóna</li>
        </ul>
      </div>
    </div>
  );
}
