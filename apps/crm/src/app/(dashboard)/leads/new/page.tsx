"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { sourceOptions, propertyTypeOptions, financingOptions, timelineOptions } from "@/lib/leads-store";

const initial = {
  name: "", email: "", phone: "", source: "Web formulár",
  location: "", budget: "", propertyType: "Byt", rooms: "2 izby",
  financing: "Hypotéka", timeline: "Do 3 mesiacov", note: "",
};

const INPUT = "w-full rounded-xl border px-3 py-3 text-sm outline-none transition-colors";
const INPUT_STYLE = { background: "#080D1A", borderColor: "rgba(34,211,238,0.15)", color: "#F0F9FF" };

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Meno je povinné."); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError("Zadaj email alebo telefón."); return; }

    setError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "Nový", score: 50, assignedAgent: "Nepriradený" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Chyba");
      router.push(`/leads/${data.lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa uložiť.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ background: "#050914" }}>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/leads" className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "rgba(34,211,238,0.08)", color: "#22D3EE" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#F0F9FF" }}>Nová príležitosť</h1>
            <p className="text-xs" style={{ color: "#475569" }}>Záujemca bude uložený okamžite</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Základné info */}
          <section className="rounded-2xl border p-4 space-y-3" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22D3EE" }}>Kontakt</p>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Meno *</label>
              <input autoFocus required value={form.name} onChange={e => update("name", e.target.value)}
                placeholder="Ján Novák" className={INPUT} style={INPUT_STYLE} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Email</label>
                <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                  placeholder="jan@email.com" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Telefón</label>
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="+421 9XX" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
          </section>

          {/* Nehnuteľnosť */}
          <section className="rounded-2xl border p-4 space-y-3" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22D3EE" }}>Nehnuteľnosť</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Typ</label>
                <select value={form.propertyType} onChange={e => update("propertyType", e.target.value)} className={INPUT} style={INPUT_STYLE}>
                  {propertyTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Izby</label>
                <input value={form.rooms} onChange={e => update("rooms", e.target.value)}
                  placeholder="2 izby" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Lokalita</label>
                <input value={form.location} onChange={e => update("location", e.target.value)}
                  placeholder="Bratislava" className={INPUT} style={INPUT_STYLE} />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Rozpočet</label>
                <input value={form.budget} onChange={e => update("budget", e.target.value)}
                  placeholder="200 000 €" className={INPUT} style={INPUT_STYLE} />
              </div>
            </div>
          </section>

          {/* Financie & termín */}
          <section className="rounded-2xl border p-4 space-y-3" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22D3EE" }}>Podrobnosti</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Financovanie</label>
                <select value={form.financing} onChange={e => update("financing", e.target.value)} className={INPUT} style={INPUT_STYLE}>
                  {financingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Termín</label>
                <select value={form.timeline} onChange={e => update("timeline", e.target.value)} className={INPUT} style={INPUT_STYLE}>
                  {timelineOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Zdroj</label>
              <select value={form.source} onChange={e => update("source", e.target.value)} className={INPUT} style={INPUT_STYLE}>
                {sourceOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: "#64748B" }}>Poznámka</label>
              <textarea value={form.note} onChange={e => update("note", e.target.value)}
                rows={3} placeholder="Záujem o 3-izbový byt v Ružinove..."
                className={INPUT} style={INPUT_STYLE} />
            </div>
          </section>

          {error && (
            <p className="text-sm text-center" style={{ color: "#EF4444" }}>{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl py-4 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%)",
              color: "#050914",
              boxShadow: "0 4px 20px rgba(34,211,238,0.3)",
            }}
          >
            {isSaving ? "Ukladám..." : "Uložiť príležitosť"}
          </button>
        </form>
      </div>
    </main>
  );
}
