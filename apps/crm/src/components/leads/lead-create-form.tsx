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
      showToast("✓ Lead uložený");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nepodarilo sa uložiť lead.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg">
          {toast}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pridať lead</h2>
            <p className="text-sm text-gray-500">Uložený do 10 sekúnd.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {isOpen ? "Zavrieť" : "+ Nový lead"}
          </button>
        </div>

        {isOpen && (
          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Meno <span className="text-red-500">*</span>
              </label>
              <input
                required
                autoFocus
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Ján Novák"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                placeholder="jan@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefón</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => update("phone", e.target.value)}
                placeholder="+421 9XX XXX XXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Zdroj</label>
              <select
                value={form.source}
                onChange={e => update("source", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                {sourceOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Poznámka</label>
              <textarea
                value={form.note}
                onChange={e => update("note", e.target.value)}
                rows={2}
                placeholder="Záujem o 3-izbový byt v Ružinove..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {isSaving ? "Ukladám..." : "Pridať lead"}
              </button>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setForm(initialState); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
