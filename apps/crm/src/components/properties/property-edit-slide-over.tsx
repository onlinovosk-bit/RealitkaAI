"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  propertyStatusOptions,
  propertyTypeOptions,
  type Property,
} from "@/lib/properties-store";

export default function PropertyEditSlideOver({
  property,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
}: {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (property: Property) => void;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<any>(property);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(
      property
        ? {
            ...property,
            featuresText: property.features.join(", "),
          }
        : null
    );
    setMessage("");
  }, [property]);

  if (!property || !form) return null;

  function updateField(name: string, value: string | number) {
    setForm((current: any) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/properties/${form.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          location: form.location,
          price: Number(form.price),
          type: form.type,
          rooms: form.rooms,
          status: form.status,
          description: form.description,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone,
          features: String(form.featuresText || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa upraviť nehnuteľnosť.");
      }

      setMessage("Nehnuteľnosť bola uložená.");
      onSaved?.(data.property);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 400);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa upraviť nehnuteľnosť."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Naozaj chceš zmazať túto nehnuteľnosť?");
    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/properties/${form.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa zmazať nehnuteľnosť.");
      }

      onDeleted?.(form.id);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa zmazať nehnuteľnosť."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-[60] transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detail / úprava nehnuteľnosti</h2>
            <p className="mt-1 text-sm text-gray-500">
              Správa ponuky v bočnom paneli.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Zavrieť
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {message && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Názov</label>
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lokalita</label>
              <input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cena</label>
              <input
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Vlastnosti</label>
              <input
                value={form.featuresText}
                onChange={(e) => updateField("featuresText", e.target.value)}
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
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Ukladám..." : "Uložiť zmeny"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Zmazať
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
