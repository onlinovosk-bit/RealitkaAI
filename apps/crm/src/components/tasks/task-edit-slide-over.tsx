"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taskPriorityOptions, taskStatusOptions, type Task } from "@/lib/tasks-store";

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

export default function TaskEditSlideOver({
  task,
  isOpen,
  onClose,
  onSaved,
  leads,
  profiles,
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (task: Task) => void;
  leads: LeadOption[];
  profiles: ProfileOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<any>(task);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(task);
    setMessage("");
  }, [task]);

  if (!task || !form) return null;

  function updateField(name: string, value: string) {
    setForm((current: any) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const taskId = task?.id;
    if (!taskId) return;

    if (!form.leadId) {
      setMessage("Vyber lead. Úloha bez leadu sa nedá uložiť.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
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
        throw new Error(data.error || "Nepodarilo sa upraviť úlohu.");
      }

      setMessage("Úloha bola uložená.");
      onSaved?.(data.task);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 400);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa upraviť úlohu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Naozaj chceš zmazať túto úlohu?");
    if (!confirmed) return;
    const taskId = task?.id;
    if (!taskId) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa zmazať úlohu.");
      }

      router.refresh();
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa zmazať úlohu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDone() {
    const taskId = task?.id;
    if (!taskId) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          status: "done",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa dokončiť úlohu.");
      }

      onSaved?.(data.task);
      router.refresh();
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nepodarilo sa dokončiť úlohu."
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
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Detail / edit úlohy</h2>
            <p className="mt-1 text-sm text-slate-500">
              Udrž ďalší krok v pohybe bez zmeny toku leadu.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            Zavrieť
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Názov úlohy</label>
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Popis</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  value={form.leadId ?? ""}
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
                  value={form.assignedProfileId ?? ""}
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
            </div>

            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="datetime-local"
                value={form.dueAt ?? ""}
                onChange={(e) => updateField("dueAt", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className={primaryButtonClass}
            >
              {saving ? "Ukladám..." : "Uložiť zmeny"}
            </button>

            <button
              type="button"
              onClick={handleMarkDone}
              disabled={saving}
              className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              Dokončiť
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              Zmazať
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
