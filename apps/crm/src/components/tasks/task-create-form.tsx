"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { taskPriorityOptions, taskStatusOptions } from "@/lib/tasks-store";

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const primaryButtonClass =
  "rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

type LeadOption = {
  id: string;
  name: string;
};

type ProfileOption = {
  id: string;
  fullName: string;
};

export default function TaskCreateForm({
  leads,
  profiles,
}: {
  leads: LeadOption[];
  profiles: ProfileOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "open",
    priority: "medium",
    leadId: "",
    assignedProfileId: "",
    dueAt: "",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(name: string, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.leadId) {
      setMessage("Vyber lead. Úloha bez leadu sa nedá uložiť.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          leadId: form.leadId,
          assignedProfileId: form.assignedProfileId || null,
          dueAt: form.dueAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť úlohu.");
      }

      setMessage("Úloha bola úspešne vytvorená.");
      setForm({
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        leadId: "",
        assignedProfileId: "",
        dueAt: "",
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa vytvoriť úlohu."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Pridať úlohu</h2>
          <p className="text-sm text-slate-500">
            Naplánuj ďalší krok pre lead, agenta alebo dnešné inkaso.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={primaryButtonClass}
        >
          {isOpen ? "Zavrieť formulár" : "Nová úloha"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {message}
        </div>
      )}

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Názov úlohy</label>
            <input
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Popis</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className={fieldClass}
            >
              {taskStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Priorita</label>
            <select
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              className={fieldClass}
            >
              {taskPriorityOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Lead</label>
            <select
              required
              value={form.leadId}
              onChange={(e) => updateField("leadId", e.target.value)}
              className={fieldClass}
            >
              <option value="">Vyber lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Priradený agent</label>
            <select
              value={form.assignedProfileId}
              onChange={(e) => updateField("assignedProfileId", e.target.value)}
              className={fieldClass}
            >
              <option value="">Nepriradené</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Deadline</label>
            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => updateField("dueAt", e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={primaryButtonClass}
            >
              {isSaving ? "Ukladám..." : "Uložiť úlohu"}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={secondaryButtonClass}
            >
              Zrušiť
            </button>
          </div>
        </form>
      )}
    </div>
  );
}