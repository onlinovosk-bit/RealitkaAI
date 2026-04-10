"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateAIInsights, Lead } from "@/lib/ai-engine";

export default function SimpleDailyActionPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      const res = await fetch("/api/leads");
      const leads: Lead[] = await res.json();
      if (!leads || leads.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const ai = generateAIInsights(leads);
      setItems(ai);
      setLoading(false);
    }
    fetchLeads();
  }, []);

  const handleAction = (type: string, lead: Lead) => {
    if (type === "call") {
      window.location.href = `tel:${lead.phone}`;
    }
    if (type === "sms") {
      window.location.href = `sms:${lead.phone}`;
    }
    if (type === "detail") {
      router.push(`/leads/${lead.id}`);
    }
  };

  return (
    <div className="p-4 border rounded-xl bg-white shadow">
      <h2 className="text-lg font-semibold mb-3">🤖 AI odporúčania na dnes</h2>

      {loading && <p>Analyzujeme tvoje leady...</p>}
      {!loading && items.length === 0 && (
        <p>Zatiaľ nemáš leady – pridaj prvý a AI ti začne odporúčať ďalšie kroky</p>
      )}

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="p-3 bg-gray-100 rounded-lg">
            <div className="font-medium">
              {item.temperature} {item.lead.name}
            </div>

            <div className="text-sm text-gray-600">👉 {item.action}</div>

            <div className="text-xs mt-1 text-gray-500">
              Na základe dát:
              {item.explanation.map((e: string, i: number) => (
                <span key={i}> • {e}</span>
              ))}
            </div>

            <div className="text-xs mt-1 text-green-600">
              {Math.round(item.confidence ?? 80)}% istota
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAction("call", item.lead)}
                className="px-2 py-1 bg-black text-white rounded"
              >
                Zavolať
              </button>

              <button
                onClick={() => handleAction("sms", item.lead)}
                className="px-2 py-1 bg-gray-300 rounded"
              >
                SMS
              </button>

              <button
                onClick={() => handleAction("detail", item.lead)}
                className="px-2 py-1 bg-gray-200 rounded"
              >
                Detail
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
