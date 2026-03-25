"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  financingOptions,
  leadStatusOptions,
  propertyTypeOptions,
  sourceOptions,
  timelineOptions,
} from "@/lib/leads-store";

type ProfileOption = {
  id: string;
  fullName: string;
  role: string;
  isActive: boolean;
};

const initialState = {
  name: "",
  email: "",
  phone: "",
  location: "",
  budget: "",
  propertyType: "Byt",
  rooms: "2 izby",
  financing: "Hypotéka",
  timeline: "Do 3 mesiacov",
  source: "Web formulár",
  status: "Nový",
  score: 50,
  assignedAgent: "Nepriradený",
  assignedProfileId: "",
  note: "",
};

export default function LeadCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfiles() {
      try {
        const response = await fetch("/api/profiles");
        const data = await response.json();
        setProfiles(data.profiles ?? []);
      } catch {
        setProfiles([]);
      }
    }

    void loadProfiles();
  }, []);

  function updateField(name: string, value: string | number) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleProfileChange(profileId: string) {
    if (!profileId) {
      setForm((current) => ({
        ...current,
        assignedProfileId: "",
        assignedAgent: "Nepriradený",
      }));
      return;
    }

    const profile = profiles.find((item) => item.id === profileId);

    setForm((current) => ({
      ...current,
      assignedProfileId: profileId,
      assignedAgent: profile?.fullName ?? current.assignedAgent,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť lead.");
      }

      setMessage("Lead bol úspešne vytvorený.");
      setForm(initialState);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa vytvoriť lead."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pridať lead</h2>
          <p className="text-sm text-gray-500">
            Jednoduchý formulár na vytvorenie nového klienta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {isOpen ? "Zavrieť formulár" : "Nový lead"}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Meno</label>
            <input
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefón</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Rozpočet</label>
            <input
              required
              value={form.budget}
              onChange={(e) => updateField("budget", e.target.value)}
              placeholder="napr. 280 000 €"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Typ nehnuteľnosti</label>
            <select
              value={form.propertyType}
              onChange={(e) => updateField("propertyType", e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Financovanie</label>
            <select
              value={form.financing}
              onChange={(e) => updateField("financing", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {financingOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Čas kúpy</label>
            <select
              value={form.timeline}
              onChange={(e) => updateField("timeline", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {timelineOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Zdroj</label>
            <select
              value={form.source}
              onChange={(e) => updateField("source", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {sourceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stav</label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              {leadStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">AI score</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.score}
              onChange={(e) => updateField("score", Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Priradený profil</label>
            <select
              value={form.assignedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            >
              <option value="">Nepriradený</option>
              {profiles
                .filter((profile) => profile.isActive && profile.role !== "owner")
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Poznámka</label>
            <textarea
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {isSaving ? "Ukladám..." : "Uložiť lead"}
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