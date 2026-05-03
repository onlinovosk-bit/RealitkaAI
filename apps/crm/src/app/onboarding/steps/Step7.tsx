"use client";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "./shared";

const TOOLS = [
  { id: "nehnutelnosti", emoji: "🏠", label: "Nehnuteľnosti.sk", desc: "Import leadov & inzerátov" },
  { id: "reality",       emoji: "🏠", label: "Reality.sk",       desc: "Import leadov & inzerátov" },
  { id: "topreality",    emoji: "⭐", label: "TopReality.sk",    desc: "Import leadov" },
  { id: "gcal",          emoji: "📅", label: "Google Calendar",  desc: "Synchronizácia prehliadok" },
  { id: "whatsapp",      emoji: "💬", label: "WhatsApp Business",desc: "AI komunikácia cez WA" },
  { id: "gmail",         emoji: "📧", label: "Gmail",            desc: "Email integrácia" },
  { id: "facebook",      emoji: "📘", label: "Facebook Leads",   desc: "Meta Lead Ads" },
  { id: "slack",         emoji: "🔴", label: "Slack / Teams",    desc: "Notifikácie pre tím" },
];

export default function Step7({ slug }: { slug: string }) {
  const { formData, update, next, back, skip, loaded, patchChecklist } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 7 ZO 8 — VOLITEĽNÝ</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Prepoj nástroje 🔗</h1>
      <p className="text-gray-500 mb-8">Spoj Revolis s nástrojmi, ktoré už používaš. Každé prepojenie ti ušetrí hodiny práce.</p>

      <div className="grid grid-cols-2 gap-3 max-w-lg mb-6">
        {TOOLS.map(tool => {
          const connected = formData.connectedTools.includes(tool.id);
          return (
            <div key={tool.id} className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-xl">{tool.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{tool.label}</div>
                  <div className="text-[11px] text-gray-400">{tool.desc}</div>
                </div>
              </div>
              <button type="button"
                onClick={() => {
                  const curr = formData.connectedTools;
                  update({ connectedTools: connected ? curr.filter(t => t !== tool.id) : [...curr, tool.id] });
                }}
                className={"text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all " +
                  (connected ? "bg-gray-900 text-white border-gray-900" : "border-gray-300 text-gray-600 hover:border-gray-900")}>
                {connected ? "Prepojené ✓" : "Pripojiť"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-gray-600 max-w-lg">
        ℹ️ Prepojenia môžeš kedykoľvek pridať v nastaveniach. Pre WhatsApp a portály potrebuješ API kľúč.
      </div>

      <div className="mt-8 flex items-center gap-4 flex-wrap">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <button type="button" onClick={skip} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">
          Preskočiť
        </button>
        <PrimaryBtn onClick={() => {
          void (formData.connectedTools.length > 0 ? patchChecklist({ connectedCrm: true }) : Promise.resolve(null)).then(() => next());
        }}>Pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
