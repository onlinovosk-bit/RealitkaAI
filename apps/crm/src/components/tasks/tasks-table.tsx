"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/tasks-store";

type LeadOption    = { id: string; name: string };
type ProfileOption = { id: string; fullName: string };

const STATUS_LABEL: Record<string, string> = {
  open:        "Otvorená",
  in_progress: "Rozpracovaná",
  done:        "Hotová",
};

const PRIORITY_LABEL: Record<string, string> = {
  high:   "Vysoká",
  medium: "Stredná",
  low:    "Nízka",
};

const PRIORITY_CLASS: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-gray-100 text-gray-600",
};

const STATUS_CLASS: Record<string, string> = {
  open:        "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  done:        "bg-green-100 text-green-700",
};

const FILTERS = [
  { key: "all",         label: "Všetky" },
  { key: "open",        label: "Otvorené" },
  { key: "in_progress", label: "Rozpracované" },
  { key: "done",        label: "Hotové" },
];

export default function TasksTable({
  tasks,
  leads,
  profiles,
  onEdit,
}: {
  tasks: Task[];
  leads: LeadOption[];
  profiles: ProfileOption[];
  onEdit?: (task: Task) => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("open");
  const [toggling, setToggling] = useState<string | null>(null);

  const visible = filter === "all"
    ? tasks
    : tasks.filter((t) => t.status === filter);

  async function toggleDone(task: Task) {
    const newStatus = task.status === "done" ? "open" : "done";
    setToggling(task.id);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          leadId: task.leadId,
          status: newStatus,
          completedAt: newStatus === "done" ? new Date().toISOString() : null,
        }),
      });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  const counts = {
    all:         tasks.length,
    open:        tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done:        tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 px-4 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors
              ${filter === f.key
                ? "border-b-2 border-gray-900 text-gray-900"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold
              ${filter === f.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
              {counts[f.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-5 py-3 font-medium">Úloha</th>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Agent</th>
              <th className="px-5 py-3 font-medium">Priorita</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Deadline</th>
              <th className="px-5 py-3 font-medium text-right">Akcia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {visible.map((task) => {
              const lead    = leads.find((l) => l.id === task.leadId);
              const profile = profiles.find((p) => p.id === task.assignedProfileId);
              const isDone  = task.status === "done";

              return (
                <tr key={task.id} className={`hover:bg-gray-50 ${isDone ? "opacity-60" : ""}`}>
                  {/* Quick done checkbox */}
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      title={isDone ? "Znovu otvoriť" : "Označiť ako hotové"}
                      disabled={toggling === task.id}
                      onClick={() => toggleDone(task)}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors
                        ${isDone
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 hover:border-gray-500"
                        } disabled:opacity-40`}
                    >
                      {isDone && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-4">
                    <div className={`font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                        {task.description}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {lead ? (
                      <a
                        href={`/leads/${task.leadId}`}
                        className="text-gray-700 hover:text-gray-900 hover:underline"
                      >
                        {lead.name}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {profile?.fullName ?? <span className="text-gray-400">-</span>}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLASS[task.priority] ?? "bg-gray-100 text-gray-600"}`}>
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[task.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {task.dueAt
                      ? new Date(task.dueAt).toLocaleDateString("sk-SK", { day: "numeric", month: "short" })
                      : <span className="text-gray-400">-</span>
                    }
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit?.(task)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Upraviť
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="border-t border-gray-100 p-6 text-center text-sm text-gray-400">
            {filter === "done"
              ? "Zatiaľ žiadne hotové úlohy."
              : filter === "in_progress"
              ? "Žiadne rozpracované úlohy."
              : "Žiadne otvorené úlohy. Dobrá práca!"}
          </div>
        )}
      </div>
    </div>
  );
}
