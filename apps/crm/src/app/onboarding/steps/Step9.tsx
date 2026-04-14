"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

const STATS = [
  { value: "24/7",  label: "AI asistent aktívny" },
  { value: "0",     label: "Kontaktov importovaných" },
  { value: "0",     label: "Fáz aktívnych" },
  { value: "7",     label: "Automatizácií zapnutých" },
  { value: "<2min", label: "AI čas odpovede" },
  { value: "+34%",  label: "Priemerný nárast konverzií" },
];

export default function Step9({ slug: _ }: { slug: string }) {
  const router = useRouter();

  return (
    <div className="animate-in zoom-in-95 fade-in duration-700">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Revolis.AI je živý!</h1>
        <p className="text-gray-500 text-base">Tvoj AI asistent {AI_ASSISTANT_NAME} je aktívny a čaká na prvý lead.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
        {STATS.map(stat => (
          <div key={stat.label} className="border border-gray-100 rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-gray-400 mt-1 leading-tight">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 max-w-lg mx-auto mb-8">
        {[
          { emoji: "📊", label: "Pozri si dashboard",   desc: "Prehľad leadov, stavu klientov a štatistiky",      href: "/dashboard" },
          { emoji: "🤖", label: "Otestuj AI asistenta", desc: "Pošli testovaciu otázku a pozri ako odpovedá", href: "/dashboard" },
          { emoji: "➕", label: "Pridaj prvý lead",      desc: "Manuálne alebo cez import z portálu",         href: "/leads" },
        ].map(item => (
          <Link key={item.label} href={item.href}
            className="border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between hover:border-gray-300 transition-all block">
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            </div>
            <span className="text-sm text-blue-600 font-medium whitespace-nowrap">Otvoriť →</span>
          </Link>
        ))}
      </div>

      <div className="flex justify-center">
        <button onClick={() => router.push("/dashboard")}
          className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-700 transition-all flex items-center gap-2">
          ✨ Prejsť do Revolis.AI Dashboard
        </button>
      </div>
    </div>
  );
}
