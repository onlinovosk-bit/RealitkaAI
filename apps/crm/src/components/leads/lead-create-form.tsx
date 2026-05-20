"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sourceOptions } from "@/lib/leads-store";

const initialState = {
  name: "",
  email: "",
  phone: "",
  source: "Web formulár",
  note: "",
};

export default function LeadCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim()) return;
    if (!form.email.trim() && !form.phone.trim()) {
      showToast("Zadaj aspoň email alebo telefón.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // defaults for required backend fields
          location: "",
          budget: "",
          propertyType: "Byt",
          rooms: "2 izby",
          financing: "Hypotéka",
          timeline: "Do 3 mesiacov",
          status: "Nový",
          score: 50,
          assignedAgent: "Nepriradený",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Chyba");

      setForm(initialState);
      setIsOpen(false);
      showToast("Príležitosť uložená");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nepodarilo sa uložiť príležitosť.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="relative">
      {toast && (
        <div
          className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg"
        >
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Pridať príležitosť</h2>
            <p className="mt-0.5 text-xs text-slate-500">Nový kontakt uložíš do 10 sekúnd.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className={
              "min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
              (isOpen
                ? "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                : "bg-orange-500 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600")
            }
          >
            {isOpen ? "Zavrieť" : "+ Nová"}
          </button>
        </div>

        {isOpen && (
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Meno <span className="text-red-600">*</span>
              </label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Ján Novák"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="jan@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Telefón</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                placeholder="+421 9XX XXX XXX"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Zdroj</label>
              <select
                value={form.source}
                onChange={e => update("source", e.target.value)}
                className={inputClass}
              >
                {sourceOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Poznámka</label>
              <textarea
                value={form.note}
                onChange={e => update("note", e.target.value)}
                rows={2}
                placeholder="Záujem o 3-izbový byt v Ružinove..."
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[44px] flex-1 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60 sm:flex-none"
              >
                {isSaving ? "Ukladám..." : "Pridať príležitosť"}
              </button>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setForm(initialState); }}
                className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Zrušiť
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
