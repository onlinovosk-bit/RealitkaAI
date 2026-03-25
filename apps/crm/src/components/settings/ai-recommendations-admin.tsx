"use client";

import { useMemo, useState } from "react";
import {
  type AiRecommendationAuditItem,
  aiRecommendationPriorityOptions,
  aiRecommendationStatusOptions,
  type AiRecommendationAdminItem,
  type AiRecommendationInput,
  type AiRecommendationPriority,
  type AiRecommendationStatus,
  type AiRecommendationType,
} from "@/lib/leads-store";

type LeadOption = {
  id: string;
  name: string;
};

const recommendationTypeOptions: Array<{
  value: AiRecommendationType;
  label: string;
}> = [
  { value: "assignment", label: "Priradenie leadu" },
  { value: "follow_up_offer", label: "Follow-up k ponuke" },
  { value: "showing_confirmation", label: "Potvrdenie obhliadky" },
  { value: "next_best_action", label: "Ďalší najlepší krok" },
  { value: "personalized_offer", label: "Personalizovaná ponuka" },
  { value: "custom", label: "Vlastné odporúčanie" },
];

const priorityLabels: Record<AiRecommendationPriority, string> = {
  high: "Vysoká",
  medium: "Stredná",
  low: "Nízka",
};

const statusLabels: Record<AiRecommendationStatus, string> = {
  active: "Aktívne",
  inactive: "Neaktívne",
};

function getPriorityClasses(priority: AiRecommendationPriority) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function createEmptyForm(leads: LeadOption[]): AiRecommendationInput {
  return {
    leadId: leads[0]?.id ?? "",
    recommendationType: "custom",
    title: "",
    description: "",
    priority: "medium",
    status: "active",
    modelVersion: "manual",
  };
}

export default function AiRecommendationsAdmin({
  initialRecommendations,
  initialAudit,
  leads,
}: {
  initialRecommendations: AiRecommendationAdminItem[];
  initialAudit: AiRecommendationAuditItem[];
  leads: LeadOption[];
}) {
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [auditItems, setAuditItems] = useState(initialAudit);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState<AiRecommendationInput>(
    createEmptyForm(leads)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AiRecommendationInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const leadMap = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead.name])),
    [leads]
  );

  const allSelected =
    recommendations.length > 0 && selectedIds.length === recommendations.length;
  const activeCount = recommendations.filter((item) => item.status === "active").length;
  const inactiveCount = recommendations.length - activeCount;
  const manualCount = recommendations.filter((item) => item.modelVersion === "manual").length;

  async function createRecommendation() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa vytvoriť odporúčanie.");
      }

      setRecommendations((current) => [data.recommendation, ...current]);
      if (data.audit) {
        setAuditItems((current) => [data.audit, ...current].slice(0, 12));
      }
      setCreateForm(createEmptyForm(leads));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vytvoriť odporúčanie."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRecommendation(id: string, payload: Partial<AiRecommendationInput>) {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa upraviť odporúčanie.");
      }

      setRecommendations((current) =>
        current.map((item) =>
          item.id === id ? data.recommendation : item
        )
      );
      if (data.audit) {
        setAuditItems((current) => [data.audit, ...current].slice(0, 12));
      }
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa upraviť odporúčanie."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === recommendations.length ? [] : recommendations.map((item) => item.id)
    );
  }

  async function applyBulkStatus(status: AiRecommendationStatus) {
    if (selectedIds.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/recommendations/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa upraviť odporúčania.");
      }

      const updated = new Map(
        (data.recommendations as AiRecommendationAdminItem[]).map((item) => [item.id, item])
      );

      setRecommendations((current) =>
        current.map((item) => updated.get(item.id) ?? item)
      );

      if (Array.isArray(data.audits) && data.audits.length > 0) {
        setAuditItems((current) => [...data.audits, ...current].slice(0, 12));
      }

      setSelectedIds([]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa upraviť odporúčania."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Aktívne odporúčania</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{activeCount}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Neaktívne odporúčania</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{inactiveCount}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Manuálne modely</p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">{manualCount}</h2>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">AI odporúčania</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manuálna správa odporúčaní uložených v databáze.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
          <select
            value={createForm.leadId}
            onChange={(e) => setCreateForm((current) => ({ ...current, leadId: e.target.value }))}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </select>

          <select
            value={createForm.recommendationType}
            onChange={(e) =>
              setCreateForm((current) => ({
                ...current,
                recommendationType: e.target.value as AiRecommendationType,
              }))
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            {recommendationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            value={createForm.title}
            onChange={(e) => setCreateForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Názov odporúčania"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 lg:col-span-2"
          />

          <select
            value={createForm.priority}
            onChange={(e) =>
              setCreateForm((current) => ({
                ...current,
                priority: e.target.value as AiRecommendationPriority,
              }))
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            {aiRecommendationPriorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isSaving || !createForm.leadId || !createForm.title.trim() || !createForm.description.trim()}
            onClick={() => void createRecommendation()}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            Pridať odporúčanie
          </button>

          <textarea
            value={createForm.description}
            onChange={(e) =>
              setCreateForm((current) => ({ ...current, description: e.target.value }))
            }
            placeholder="Popis odporúčania"
            rows={3}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 lg:col-span-6"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Databázové odporúčania</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500">Vybrané: {selectedIds.length}</span>
              <button
                type="button"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => void applyBulkStatus("active")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Aktivovať vybrané
              </button>
              <button
                type="button"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => void applyBulkStatus("inactive")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Deaktivovať vybrané
              </button>
              <button
                type="button"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => setSelectedIds([])}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Zrušiť výber
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Typ</th>
                <th className="px-5 py-3 font-medium">Odporúčanie</th>
                <th className="px-5 py-3 font-medium">Priorita</th>
                <th className="px-5 py-3 font-medium">Stav</th>
                <th className="px-5 py-3 font-medium">Model</th>
                <th className="px-5 py-3 font-medium text-right">Akcie</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {recommendations.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="align-top hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.leadId}
                          onChange={(e) =>
                            setEditForm((current) =>
                              current ? { ...current, leadId: e.target.value } : current
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                        >
                          {leads.map((lead) => (
                            <option key={lead.id} value={lead.id}>
                              {lead.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        leadMap.get(item.leadId) ?? item.leadId
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.recommendationType}
                          onChange={(e) =>
                            setEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    recommendationType: e.target.value as AiRecommendationType,
                                  }
                                : current
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                        >
                          {recommendationTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        recommendationTypeOptions.find((option) => option.value === item.recommendationType)
                          ?.label ?? item.recommendationType
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing && editForm ? (
                        <div className="space-y-2">
                          <input
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm((current) =>
                                current ? { ...current, title: e.target.value } : current
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                          />
                          <textarea
                            value={editForm.description}
                            onChange={(e) =>
                              setEditForm((current) =>
                                current ? { ...current, description: e.target.value } : current
                              )
                            }
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="mt-1 text-sm text-gray-600">{item.description}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.priority}
                          onChange={(e) =>
                            setEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    priority: e.target.value as AiRecommendationPriority,
                                  }
                                : current
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                        >
                          {aiRecommendationPriorityOptions.map((priority) => (
                            <option key={priority} value={priority}>
                              {priorityLabels[priority]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClasses(item.priority)}`}
                        >
                          {priorityLabels[item.priority]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.status}
                          onChange={(e) =>
                            setEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    status: e.target.value as AiRecommendationStatus,
                                  }
                                : current
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                        >
                          {aiRecommendationStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {statusLabels[item.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{item.modelVersion}</td>
                    <td className="px-5 py-4 text-right">
                      {isEditing && editForm ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSaving || !editForm.title.trim() || !editForm.description.trim()}
                            onClick={() => void saveRecommendation(item.id, editForm)}
                            className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                          >
                            Uložiť
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm(null);
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Zrušiť
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm({
                                leadId: item.leadId,
                                recommendationType: item.recommendationType,
                                title: item.title,
                                description: item.description,
                                priority: item.priority,
                                status: item.status,
                                modelVersion: item.modelVersion,
                              });
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Upraviť
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              void saveRecommendation(item.id, {
                                status: item.status === "active" ? "inactive" : "active",
                              })
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {item.status === "active" ? "Deaktivovať" : "Aktivovať"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {recommendations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-500">
                    Zatiaľ nie sú dostupné žiadne AI odporúčania.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Audit trail AI odporúčaní</h3>
          <p className="text-sm text-gray-500">
            Posledné vytvorenia, úpravy a aktivácie odporúčaní naprieč leadmi.
          </p>
        </div>

        <div className="space-y-3">
          {auditItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.leadName}</div>
                  <div className="mt-1 text-sm text-gray-600">{item.text}</div>
                </div>
                <div className="text-sm text-gray-500">{item.date}</div>
              </div>
            </div>
          ))}

          {auditItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              Zatiaľ nie sú zaznamenané žiadne zmeny AI odporúčaní.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}