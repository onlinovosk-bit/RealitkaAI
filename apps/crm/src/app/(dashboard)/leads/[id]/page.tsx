"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getActivitiesByLeadId,
  leadStatusOptions,
  sourceOptions,
  type Lead,
  type LeadActivity,
} from "@/lib/leads-store";

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === "Horúci") return "bg-red-100 text-red-700";
  if (status === "Teplý") return "bg-orange-100 text-orange-700";
  if (status === "Obhliadka") return "bg-blue-100 text-blue-700";
  if (status === "Ponuka") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

function activityDot(type: string) {
  if (type === "Email") return "bg-blue-400";
  if (type === "Obhliadka") return "bg-emerald-400";
  if (type === "Telefonat") return "bg-amber-400";
  return "bg-gray-400";
}

function useToast() {
  const [msg, setMsg] = useState("");
  const show = useCallback((text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  }, []);
  return { msg, show };
}

// ─── InlineField ──────────────────────────────────────────────────────────────

function InlineField({
  label,
  value,
  onSave,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  const sharedClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500";

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            className={sharedClass}
          />
        ) : (
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === "Enter" && commit()}
            className={sharedClass}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
        >
          {draft || <span className="text-gray-400">Klikni na úpravu…</span>}
        </button>
      )}
    </div>
  );
}

// ─── InlineSelect ─────────────────────────────────────────────────────────────

function InlineSelect({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value: string;
  options: string[];
  onSave: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <select
        value={value}
        onChange={e => onSave(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params = useParams() as Record<string, string> | null;
  const router = useRouter();
  const id = params?.id ?? "";

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingField, setIsSavingField] = useState(false);
  const [sofiaInsight, setSofiaInsight] = useState<string | null>(null);

  // Sofia chat
  const [sofiaQ, setSofiaQ] = useState("");
  const [sofiaAnswer, setSofiaAnswer] = useState("");
  const [sofiaAsking, setSofiaAsking] = useState(false);

  // activity form
  const [actType, setActType] = useState("Telefonát");
  const [actNote, setActNote] = useState("");
  const [isAddingAct, setIsAddingAct] = useState(false);

  // delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { msg: toast, show: showToast } = useToast();

  // ── load ──
  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [leadRes, acts] = await Promise.all([
          fetch(`/api/leads/${id}`).then(r => r.json()),
          getActivitiesByLeadId(id),
        ]);
        if (!leadRes?.lead) { router.push("/leads"); return; }
        const l = leadRes.lead as Lead & { sofia_insight?: string };
        setLead(l);
        if (l.sofia_insight) setSofiaInsight(l.sofia_insight);
        setActivities(acts);
      } catch {
        router.push("/leads");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id, router]);

  // ── patch lead ──
  const patchLead = useCallback(async (fields: Partial<Lead>) => {
    if (!lead) return;
    const optimistic = { ...lead, ...fields };
    setLead(optimistic);
    setIsSavingField(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Chyba");
      setLead(data.lead as Lead);
    } catch (e) {
      setLead(lead); // rollback
      showToast(e instanceof Error ? e.message : "Nepodarilo sa uložiť.");
    } finally {
      setIsSavingField(false);
    }
  }, [lead, id, showToast]);

  // ── add activity ──
  async function addActivity(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actNote.trim()) return;
    setIsAddingAct(true);
    try {
      const res = await fetch(`/api/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actType, note: actNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      // optimistic prepend
      const newAct: LeadActivity = {
        id: data.activity?.id ?? crypto.randomUUID(),
        type: actType as LeadActivity["type"],
        text: actNote,
        date: "Práve teraz",
      };
      setActivities(prev => [newAct, ...prev]);
      setActNote("");
      showToast("✓ Aktivita pridaná");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Chyba");
    } finally {
      setIsAddingAct(false);
    }
  }

  // ── sofia chat ──
  async function askSofia(e: React.FormEvent) {
    e.preventDefault();
    if (!sofiaQ.trim()) return;
    setSofiaAsking(true);
    setSofiaAnswer("");
    try {
      const res = await fetch(`/api/leads/${id}/sofia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: sofiaQ }),
      });
      const data = await res.json();
      if (data.ok) setSofiaAnswer(data.answer);
      else setSofiaAnswer("Sofia momentálne nie je dostupná.");
    } catch {
      setSofiaAnswer("Sofia momentálne nie je dostupná.");
    } finally {
      setSofiaAsking(false);
    }
  }

  // ── delete ──
  async function deleteLead() {
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      router.push("/leads");
    } catch {
      showToast("Nepodarilo sa zmazať lead.");
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="p-6">
        <div className="text-center text-sm text-gray-400">Načítavam…</div>
      </main>
    );
  }
  if (!lead) return null;

  return (
    <main className="p-6">
      {/* toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        {/* back */}
        <Link href="/leads" className="text-sm text-gray-400 hover:text-gray-700">
          ← Späť na leady
        </Link>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="text-sm text-gray-600 hover:text-gray-900">
                  {lead.phone}
                </a>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(lead.status)}`}>
                {lead.status}
              </span>
              {isSavingField && (
                <span className="text-xs text-gray-400">Ukladám…</span>
              )}
            </div>
          </div>

          {/* header actions */}
          <div className="flex gap-2">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Zmazať lead
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                <span className="text-sm text-red-700">Naozaj zmazať?</span>
                <button type="button" onClick={deleteLead} className="text-sm font-semibold text-red-700 hover:text-red-900">
                  Áno
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500">
                  Nie
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 2-COLUMN LAYOUT ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* LEFT 70% */}
          <div className="xl:col-span-2 space-y-6">

            {/* Lead Info Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Informácie o leade</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InlineField label="Meno" value={lead.name} onSave={v => patchLead({ name: v })} />
                <InlineField label="Email" value={lead.email} type="email" onSave={v => patchLead({ email: v })} />
                <InlineField label="Telefón" value={lead.phone} type="tel" onSave={v => patchLead({ phone: v })} />
                <InlineSelect
                  label="Zdroj"
                  value={lead.source}
                  options={sourceOptions}
                  onSave={v => patchLead({ source: v })}
                />
                <div className="md:col-span-2">
                  <InlineField label="Poznámka" value={lead.note} multiline onSave={v => patchLead({ note: v })} />
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Aktivity</h2>

              {/* Add activity form */}
              <form onSubmit={addActivity} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex gap-3">
                  <select
                    value={actType}
                    onChange={e => setActType(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  >
                    {["Telefonát", "Email", "Obhliadka", "Poznámka"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={actNote}
                  onChange={e => setActNote(e.target.value)}
                  placeholder="Čo sa stalo? Zapíš poznámku…"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 mb-3"
                />
                <button
                  type="submit"
                  disabled={isAddingAct || !actNote.trim()}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isAddingAct ? "Pridávam…" : "+ Pridať aktivitu"}
                </button>
              </form>

              {/* Timeline */}
              <div className="space-y-3">
                {activities.length === 0 && (
                  <p className="text-sm text-gray-400">Zatiaľ žiadne aktivity.</p>
                )}
                {activities.map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityDot(act.type)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">{act.type}</span>
                        <span className="text-xs text-gray-400">{act.date}</span>
                      </div>
                      <p className="text-sm text-gray-600">{act.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT 30% */}
          <div className="space-y-4">

            {/* Status Panel */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</p>
              <select
                value={lead.status}
                onChange={e => patchLead({ status: e.target.value as Lead["status"] })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium outline-none focus:border-gray-500"
              >
                {leadStatusOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Rýchle akcie</p>
              <div className="space-y-2">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
                  >
                    📞 Zavolať
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
                  >
                    ✉️ Poslať email
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => showToast("Kalendár — čoskoro")}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
                >
                  📅 Naplánovať obhliadku
                </button>
              </div>
            </div>

            {/* AI Score */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">AI Skóre</p>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${
                  (lead.score ?? 0) >= 70 ? "text-emerald-600" :
                  (lead.score ?? 0) >= 40 ? "text-amber-600" : "text-gray-500"
                }`}>{lead.score ?? "—"}</span>
                <span className="mb-1 text-sm text-gray-400">/ 100</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    (lead.score ?? 0) >= 70 ? "bg-emerald-500" :
                    (lead.score ?? 0) >= 40 ? "bg-amber-400" : "bg-gray-300"
                  }`}
                  style={{ width: `${lead.score ?? 0}%` }}
                />
              </div>
            </div>

            {/* Sofia Insight */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">Sofia AI</p>
              {sofiaInsight ? (
                <p className="text-sm text-violet-900">{sofiaInsight}</p>
              ) : (
                <p className="text-sm text-violet-400">Insight sa vygeneruje po prvej zmene leadu.</p>
              )}

              {/* Chat */}
              <form onSubmit={askSofia} className="mt-4 space-y-2">
                <input
                  value={sofiaQ}
                  onChange={e => setSofiaQ(e.target.value)}
                  placeholder="Opýtaj sa Sofiu…"
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 placeholder:text-violet-300"
                />
                <button
                  type="submit"
                  disabled={sofiaAsking || !sofiaQ.trim()}
                  className="w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  {sofiaAsking ? "Myslím…" : "Opýtať Sofiu →"}
                </button>
              </form>
              {sofiaAnswer && (
                <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3 text-sm text-violet-900">
                  {sofiaAnswer}
                </div>
              )}
            </div>

            {/* Meta Info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Meta</p>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Zdroj</dt>
                  <dd className="font-medium text-gray-700">{lead.source || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Maklér</dt>
                  <dd className="font-medium text-gray-700">{lead.assignedAgent || "Nepriradený"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Posledný kontakt</dt>
                  <dd className="font-medium text-gray-700">{lead.lastContact || "—"}</dd>
                </div>
                {(() => {
                  const extra = lead as unknown as Record<string, unknown>;
                  const seg = typeof extra["client_segment"] === "string" ? extra["client_segment"] : null;
                  const score = typeof extra["buyer_readiness_score"] === "number" ? extra["buyer_readiness_score"] : null;
                  return (
                    <>
                      {seg && (
                        <div>
                          <dt className="text-xs text-gray-400">Segment</dt>
                          <dd className="font-medium text-gray-700 capitalize">{seg.replace(/_/g, " ")}</dd>
                        </div>
                      )}
                      {score != null && (
                        <div>
                          <dt className="text-xs text-gray-400">Skóre pripravenosti</dt>
                          <dd className="font-medium text-gray-700">{score}/100</dd>
                        </div>
                      )}
                    </>
                  );
                })()}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
