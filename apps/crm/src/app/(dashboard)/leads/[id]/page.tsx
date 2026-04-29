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
import { buildGoogleCalendarTemplateUrl, openGoogleCalendarUrl } from "@/lib/google-calendar-url";
import {
  AI_ASSISTANT_CHAT_CTA,
  AI_ASSISTANT_CHAT_LABEL,
  AI_ASSISTANT_NAME,
} from "@/lib/ai-brand";
import {
  buildNexusChatInstruction,
  DEFAULT_NEXUS_CHAT_SETTINGS,
  NEXUS_CHAT_SETTINGS_STORAGE_KEY,
  type NexusChatSettings,
} from "@/lib/nexus-chat-settings";
import { useRealtimeLeadScore } from "@/hooks/useRealtimeLeadScore";
import SalesBrainPanel from "@/components/leads/sales-brain-panel";
import DealStrategyCard from "@/components/leads/deal-strategy-card";
import KatasterMonitorCard from "@/components/leads/KatasterMonitorCard";

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

  const sharedClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500";

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
          className="w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm text-gray-900 transition-all hover:border-cyan-100 hover:bg-gradient-to-r hover:from-cyan-50/70 hover:to-indigo-50/70 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800"
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
  const [chatSettings, setChatSettings] = useState<NexusChatSettings>(DEFAULT_NEXUS_CHAT_SETTINGS);

  // activity form
  const [actType, setActType] = useState("Telefonát");
  const [actNote, setActNote] = useState("");
  const [isAddingAct, setIsAddingAct] = useState(false);

  // delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { msg: toast, show: showToast } = useToast();

  const [scorePulse, setScorePulse] = useState(false);
  const [watchedCount, setWatchedCount] = useState(0);
  const [activatingWatch, setActivatingWatch] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [decisionOutput, setDecisionOutput] = useState<string>("");

  const onRealtimeScore = useCallback(
    (u: { leadId: string; score: number }) => {
      setLead((prev) =>
        prev && prev.id === u.leadId ? { ...prev, score: u.score } : prev
      );
      setScorePulse(true);
      window.setTimeout(() => setScorePulse(false), 800);
    },
    []
  );

  useRealtimeLeadScore(id || undefined, onRealtimeScore);

  const accountTier: "market_vision" | "authority" = "market_vision";

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
        const l = leadRes.lead as Lead & { sofia_insight?: string; ai_insight?: string };
        setLead(l);
        if (l.ai_insight || l.sofia_insight) {
          setSofiaInsight(l.ai_insight ?? l.sofia_insight ?? null);
        }
        setActivities(acts);
      } catch {
        router.push("/leads");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [id, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NEXUS_CHAT_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NexusChatSettings>;
      setChatSettings((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid local setting payload
    }
  }, []);

  useEffect(() => {
    async function loadWatchCount() {
      try {
        const res = await fetch("/api/kataster/watch", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; count?: number };
        if (res.ok && data.ok) {
          setWatchedCount(data.count ?? 0);
        }
      } catch {
        // best-effort for demo card
      }
    }
    void loadWatchCount();
  }, []);

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
    if (!actNote.trim() || !lead) return;
    const savedNote = actNote.trim();
    setIsAddingAct(true);
    try {
      const res = await fetch(`/api/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actType, note: savedNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      // optimistic prepend
      const newAct: LeadActivity = {
        id: data.activity?.id ?? crypto.randomUUID(),
        type: actType as LeadActivity["type"],
        text: savedNote,
        date: "Práve teraz",
      };
      setActivities(prev => [newAct, ...prev]);
      setActNote("");

      const cal = data.calendar as
        | { status: "created"; eventId?: string }
        | { status: "fallback"; url: string }
        | { status: "skipped" }
        | undefined;

      if (cal?.status === "created") {
        showToast("✓ Aktivita pridaná — pripomienka o 8:00 je uložená v Google Kalendári.");
      } else if (cal?.status === "fallback" && cal.url) {
        openGoogleCalendarUrl(cal.url);
        showToast("✓ Aktivita pridaná — otvor Google Kalendár a potvrď udalosť.");
      } else {
        showToast("✓ Aktivita pridaná");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Chyba");
    } finally {
      setIsAddingAct(false);
    }
  }

  function openViewingCalendar() {
    if (!lead) return;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);
    const url = buildGoogleCalendarTemplateUrl({
      title: `${lead.name} – obhliadka`,
      details: "Naplánované z Revolis.AI",
      start,
      end,
    });
    openGoogleCalendarUrl(url);
    showToast("Otváram Google Kalendár…");
  }

  async function runDecisionAction(
    action:
      | "score-lead"
      | "recompute-queue"
      | "closing-window"
      | "rescue-trigger"
      | "micro-actions",
  ) {
    if (!id) return;
    setDecisionBusy(action);
    try {
      const map: Record<typeof action, { url: string; body?: Record<string, unknown> }> = {
        "score-lead": { url: "/api/ai/decision/score-lead", body: { leadId: id } },
        "recompute-queue": { url: "/api/ai/decision/recompute-queue" },
        "closing-window": { url: "/api/ai/closing-window/recompute", body: { leadId: id } },
        "rescue-trigger": { url: "/api/ai/rescue/trigger", body: { leadId: id, triggerType: "manual_ui" } },
        "micro-actions": { url: "/api/ai/micro-actions/schedule", body: { leadId: id } },
      };

      const selected = map[action];
      const res = await fetch(selected.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: selected.body ? JSON.stringify(selected.body) : undefined,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        showToast(data.error ?? "L99 operácia zlyhala.");
        setDecisionOutput(JSON.stringify(data, null, 2));
        return;
      }
      showToast("L99 operácia dokončená.");
      setDecisionOutput(JSON.stringify(data, null, 2));
    } catch {
      showToast("Chyba siete pri L99 operácii.");
    } finally {
      setDecisionBusy(null);
    }
  }

  // ── sofia chat ──
  async function askSofia(e: React.FormEvent) {
    e.preventDefault();
    if (!sofiaQ.trim()) return;
    setSofiaAsking(true);
    setSofiaAnswer("");
    try {
      const styledQuestion = `${sofiaQ}\n\nInštrukcia pre štýl odpovede: ${buildNexusChatInstruction(chatSettings)}`;
      const res = await fetch(`/api/leads/${id}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: styledQuestion }),
      });
      const data = await res.json();
      if (data.ok) setSofiaAnswer(data.answer);
      else setSofiaAnswer(`${AI_ASSISTANT_NAME} momentálne nie je dostupná.`);
    } catch {
      setSofiaAnswer(`${AI_ASSISTANT_NAME} momentálne nie je dostupná.`);
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
      showToast("Nepodarilo sa zmazať príležitosť.");
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
          ← Späť na príležitosti
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
                Zmazať príležitosť
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
              <h2 className="mb-4 text-base font-semibold text-gray-900">Informácie o príležitosti</h2>
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
                <p className="mb-3 text-xs text-gray-400">
                  Tip: Dátum a čas obhliadky píš do poznámky (napr. 15.4.2026 14:00 je len ukážka). Pripomienka na 8:00 sa vytvorí na ten deň, ktorý v poznámke uvedieš — vždy iný podľa textu. Ak máš pripojený Google účet v nastaveniach, udalosť sa uloží priamo do kalendára.
                </p>
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
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-cyan-200 hover:bg-gradient-to-r hover:from-cyan-50/70 hover:to-indigo-50/70 w-full"
                  >
                    📞 Zavolať
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-cyan-200 hover:bg-gradient-to-r hover:from-cyan-50/70 hover:to-indigo-50/70 w-full"
                  >
                    ✉️ Poslať email
                  </a>
                )}
                <button
                  type="button"
                  onClick={openViewingCalendar}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-cyan-200 hover:bg-gradient-to-r hover:from-cyan-50/70 hover:to-indigo-50/70 w-full"
                >
                  📅 Naplánovať obhliadku
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/ai/autopilot/run", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ leadId: id }),
                      });
                      const data = (await res.json()) as {
                        ok?: boolean;
                        results?: { ok: boolean; detail: string }[];
                        error?: string;
                      };
                      if (!res.ok || !data.ok) {
                        showToast(data.error ?? "Autopilot zlyhal.");
                        return;
                      }
                      const okCount = data.results?.filter((r) => r.ok).length ?? 0;
                      showToast(
                        okCount
                          ? `Autopilot: ${okCount} akcií spracovaných (pozri aktivity).`
                          : "Autopilot: žiadna pravidlá nespustili akciu."
                      );
                    } catch {
                      showToast("Chyba siete pri autopilot-e.");
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 text-sm font-medium text-emerald-900 transition-all hover:bg-emerald-100 w-full"
                >
                  🤖 Spustiť AI Autopilot
                </button>
              </div>
            </div>

            {id ? (
              <Link
                href={`/dashboard?lead=${encodeURIComponent(id)}`}
                className="block rounded-2xl border border-indigo-500/25 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-100 transition hover:bg-indigo-950/50"
              >
                <span className="font-semibold text-white">AI Asistent (Codai)</span>
                <span className="mt-0.5 block text-xs text-indigo-200/80">
                  Otvoriť dashboard s kontextom tejto príležitosti →
                </span>
              </Link>
            ) : null}
            {id ? <SalesBrainPanel leadId={id} /> : null}
            {id ? <DealStrategyCard leadId={id} /> : null}
            {id ? (
              <KatasterMonitorCard
                parcelId={id}
                accountTier={accountTier}
                currentWatchedCount={watchedCount}
                isSubmitting={activatingWatch}
                onActivate={async () => {
                  try {
                    setActivatingWatch(true);
                    const res = await fetch("/api/kataster/watch", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        parcelId: id,
                        leadId: id,
                        accountTier,
                      }),
                    });
                    const data = (await res.json()) as { ok?: boolean; error?: string };
                    if (!res.ok || !data.ok) {
                      showToast(data.error ?? "Aktivácia sledovania zlyhala.");
                      return;
                    }
                    setWatchedCount((prev) => prev + 1);
                    showToast("Kataster Pulse aktivovaný.");
                  } catch {
                    showToast("Chyba siete pri aktivácii sledovania.");
                  } finally {
                    setActivatingWatch(false);
                  }
                }}
              />
            ) : null}

            {/* AI Score */}
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow duration-500 ${
                scorePulse ? "ring-2 ring-cyan-400/80 shadow-[0_0_24px_rgba(34,211,238,0.35)]" : ""
              }`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">AI Skóre (CRM)</p>
              {lead.ai_engine && (
                <p className="mb-2 text-[10px] leading-snug text-slate-500">
                  Uložený Brain (DB): {lead.ai_engine.combinedScore}/100 · conf. {lead.ai_engine.confidence}% · TTC
                  ~{lead.ai_engine.timeToCloseDays} dní
                </p>
              )}
              <div className="flex items-end gap-2">
                <span
                  className={`text-3xl font-bold transition-all duration-500 ${
                  (lead.score ?? 0) >= 70 ? "text-emerald-600" :
                  (lead.score ?? 0) >= 40 ? "text-amber-600" : "text-gray-500"
                } ${scorePulse ? "scale-105" : ""}`}
                >
                  {lead.score ?? "—"}
                </span>
                <span className="mb-1 text-sm text-gray-400">/ 100</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-[width] duration-700 ease-out ${
                    (lead.score ?? 0) >= 70 ? "bg-emerald-500" :
                    (lead.score ?? 0) >= 40 ? "bg-amber-400" : "bg-gray-300"
                  }`}
                  style={{ width: `${lead.score ?? 0}%` }}
                />
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded-lg border border-cyan-200/80 bg-gradient-to-r from-cyan-50/90 to-indigo-50/80 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-cyan-300 hover:from-cyan-50 hover:to-indigo-50"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        leadId: id,
                        signals: {
                          email_open: 1,
                          link_click: 0.9,
                          page_view: 0.5,
                          reply: 0.3,
                        },
                      }),
                    });
                    const data = (await res.json()) as {
                      ok?: boolean;
                      lead?: Lead;
                      score?: number;
                      error?: string;
                    };
                    if (!res.ok || !data.ok) {
                      showToast(data.error ?? "Signály sa neodoslali.");
                      return;
                    }
                    if (data.lead) setLead(data.lead);
                    else if (typeof data.score === "number") {
                      setLead((prev) =>
                        prev ? { ...prev, score: data.score as number } : prev
                      );
                    }
                  } catch {
                    showToast("Chyba siete pri odosielaní signálov.");
                  }
                }}
              >
                ⚡ Demo: live signály → nové skóre
              </button>
            </div>

            {/* Sofia Insight */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-500">{AI_ASSISTANT_CHAT_LABEL}</p>
              <Link href="/settings/nexus-ai-chat" className="mb-2 inline-block text-xs font-medium text-violet-700 hover:underline">
                Nastaviť štýl odpovedí →
              </Link>
              {sofiaInsight ? (
                <p className="text-sm text-violet-900">{sofiaInsight}</p>
              ) : (
                <p className="text-sm text-violet-400">Insight sa vygeneruje po prvej zmene príležitosti.</p>
              )}

              {/* Chat */}
              <form onSubmit={askSofia} className="mt-4 space-y-2">
                <input
                  value={sofiaQ}
                  onChange={e => setSofiaQ(e.target.value)}
                  placeholder={`Opýtaj sa ${AI_ASSISTANT_NAME}…`}
                  className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 placeholder:text-violet-300"
                />
                <button
                  type="submit"
                  disabled={sofiaAsking || !sofiaQ.trim()}
                  className="w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  {sofiaAsking ? "Myslím…" : `${AI_ASSISTANT_CHAT_CTA} →`}
                </button>
              </form>
              {sofiaAnswer && (
                <div className="mt-3 rounded-xl border border-violet-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-3 text-sm text-white shadow-[0_0_24px_rgba(76,29,149,0.20)]">
                  {sofiaAnswer}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-cyan-200/60 bg-gradient-to-b from-cyan-50/70 to-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">L99 Decision Ops (beta)</p>
              <p className="mb-3 text-xs text-slate-600">
                Additive AI vrstva. Pôvodné flowy ostávajú nezmenené. Operácie rešpektujú feature flagy.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => void runDecisionAction("score-lead")}
                  disabled={decisionBusy !== null}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 disabled:opacity-60"
                >
                  {decisionBusy === "score-lead" ? "Počítam score..." : "1) Score lead (who/what/when/prob/revenue)"}
                </button>
                <button
                  type="button"
                  onClick={() => void runDecisionAction("recompute-queue")}
                  disabled={decisionBusy !== null}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 disabled:opacity-60"
                >
                  {decisionBusy === "recompute-queue" ? "Prepočítavam queue..." : "2) Recompute priority queue"}
                </button>
                <button
                  type="button"
                  onClick={() => void runDecisionAction("closing-window")}
                  disabled={decisionBusy !== null}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 disabled:opacity-60"
                >
                  {decisionBusy === "closing-window" ? "Počítam closing window..." : "3) Recompute closing window"}
                </button>
                <button
                  type="button"
                  onClick={() => void runDecisionAction("rescue-trigger")}
                  disabled={decisionBusy !== null}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 disabled:opacity-60"
                >
                  {decisionBusy === "rescue-trigger" ? "Spúšťam rescue..." : "4) Trigger rescue plan"}
                </button>
                <button
                  type="button"
                  onClick={() => void runDecisionAction("micro-actions")}
                  disabled={decisionBusy !== null}
                  className="rounded-lg border border-cyan-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-cyan-50 disabled:opacity-60"
                >
                  {decisionBusy === "micro-actions" ? "Plánujem micro-actions..." : "5) Schedule micro-actions"}
                </button>
              </div>
              <pre className="mt-3 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-[11px] text-cyan-200">
                {decisionOutput || '{ "info": "Spusti operáciu pre výstup." }'}
              </pre>
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
