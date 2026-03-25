"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { taskPriorityOptions, taskStatusOptions, type Task } from "@/lib/tasks-store";

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
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detail / edit úlohy</h2>
            <p className="mt-1 text-sm text-gray-500">
              Správa tasku v slide-over paneli.
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

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Názov úlohy</label>
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Popis</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                >
                  {taskStatusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priorita</label>
                <select
                  value={form.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                >
                  {taskPriorityOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lead</label>
                <select
                  required
                  value={form.leadId ?? ""}
                  onChange={(e) => updateField("leadId", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Priradený agent</label>
                <select
                  value={form.assignedProfileId ?? ""}
                  onChange={(e) => updateField("assignedProfileId", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Deadline</label>
              <input
                type="datetime-local"
                value={form.dueAt ?? ""}
                onChange={(e) => updateField("dueAt", e.target.value)}
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
              onClick={handleMarkDone}
              disabled={saving}
              className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-60"
            >
              Dokončiť
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
