"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  agentsCount: string;
  city: string;
  note: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  agentsCount: "",
  city: "",
  note: "",
};

export default function DemoRequestForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/sales-funnel/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          agentsCount: Number(form.agentsCount || 0),
          city: form.city,
          note: form.note,
          source: "Demo page",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa odoslať žiadosť o demo.");
      }

      setMessage("Ďakujeme. Tvoja žiadosť bola prijatá — ozveme sa s návrhom termínu.");
      setForm(initialState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odoslanie zlyhalo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Požiadať o demo</h2>
      <p className="mt-1 text-sm text-gray-500">
        Získaš nezáväzné demo na mieru: ukážeme ti AI hodnotenie kontaktov, automatické oslovovanie klientov
        a predikciu obchodného lievika pre tvoju realitnú kanceláriu.
      </p>

      {message && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Meno" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Telefón" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Spoločnosť" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required type="number" min={1} value={form.agentsCount} onChange={(e) => update("agentsCount", e.target.value)} placeholder="Počet agentov" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Mesto" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <textarea value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Poznámka" rows={4} className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

      <button type="submit" disabled={isSubmitting} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
        {isSubmitting ? "Odosielam..." : "Odoslať žiadosť o demo"}
      </button>

      <p className="mt-2 text-xs text-gray-500">Bez záväzku. Ozveme sa s návrhom termínu a konkrétnym scenárom ukážky.</p>
    </form>
  );
}
