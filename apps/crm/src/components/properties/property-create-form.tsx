"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  propertyStatusOptions,
  propertyTypeOptions,
} from "@/lib/properties-store";

const initialState = {
  title: "",
  location: "",
  price: 0,
  type: "Byt",
  rooms: "2 izby",
  features: "",
  status: "Aktívna",
  description: "",
  ownerName: "",
  ownerPhone: "",
};

export default function PropertyCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string | number) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          features: String(form.features)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť nehnuteľnosť.");
      }

      setMessage("Nehnuteľnosť bola úspešne vytvorená.");
      setForm(initialState);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa vytvoriť nehnuteľnosť."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pridať nehnuteľnosť</h2>
          <p className="text-sm text-gray-500">Nová ponuka do inventory modulu.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {isOpen ? "Zavrieť formulár" : "Nová nehnuteľnosť"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Názov</label>
            <input
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Lokalita</label>
            <input
              required
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cena</label>
            <input
              required
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => updateField("price", Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Typ</label>
            <select
              value={form.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {propertyTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Počet izieb</label>
            <input
              value={form.rooms}
              onChange={(e) => updateField("rooms", e.target.value)}
              placeholder="napr. 3 izby"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stav</label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {propertyStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Features</label>
            <input
              value={form.features}
              onChange={(e) => updateField("features", e.target.value)}
              placeholder="napr. balkón, garáž, novostavba"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Popis</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Meno vlastníka</label>
            <input
              value={form.ownerName}
              onChange={(e) => updateField("ownerName", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefón vlastníka</label>
            <input
              value={form.ownerPhone}
              onChange={(e) => updateField("ownerPhone", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSaving ? "Ukladám..." : "Uložiť nehnuteľnosť"}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Zrušiť
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
