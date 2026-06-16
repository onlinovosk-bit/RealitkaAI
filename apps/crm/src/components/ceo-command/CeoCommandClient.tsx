"use client";

import { useCallback, useEffect, useState } from "react";

type CeoNotification = {
  id: string;
  title: string;
  body: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
};

type CeoSection = {
  id: string;
  title: string;
  status: "live" | "pending";
  value: string;
  note: string;
};

type CeoSummary = {
  generatedAt: string;
  sections: CeoSection[];
  recommendations: string[];
};

type LoadState = "loading" | "ready" | "error";

function priorityLabel(priority: string): string {
  if (priority === "critical") return "Kritické";
  if (priority === "high") return "Vysoká";
  return "Normálna";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sk-SK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CeoCommandClient() {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<CeoNotification[]>([]);
  const [summary, setSummary] = useState<CeoSummary | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/ceo-command", { credentials: "include" });
      if (!res.ok) {
        setState("error");
        return;
      }
      const json = (await res.json()) as { notifications?: CeoNotification[]; summary?: CeoSummary | null };
      const list = json.notifications ?? [];
      setItems(list);
      setSummary(json.summary ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/ceo-command/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        );
      }
    } finally {
      setMarkingId(null);
    }
  }

  if (state === "loading") {
    return (
      <p className="text-sm text-slate-400" data-testid="ceo-command-loading">
        Načítavam CEO príkazy…
      </p>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center" data-testid="ceo-command-error">
        <p className="text-sm text-red-200">Nepodarilo sa načítať CEO príkazy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ceo-command-ready">
      <section className="rounded-xl border border-white/10 bg-slate-900/40 p-4" data-testid="ceo-command-summary">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white">CEO Command Center</h2>
          {summary ? (
            <time className="text-xs text-slate-400">Aktualizované: {formatWhen(summary.generatedAt)}</time>
          ) : null}
        </div>
        {summary ? (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {summary.sections.map((section) => (
                <li key={section.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3" data-testid={`ceo-section-${section.id}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{section.title}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        section.status === "live" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {section.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-cyan-300">{section.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{section.note}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
              <h3 className="text-sm font-semibold text-white">Čo by som dnes riešil</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-300" data-testid="ceo-command-recommendations">
                {summary.recommendations.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            CEO summary sa doplní po načítaní leadov a Seller Rescue notifikácií.
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-white/15 bg-slate-900/30 p-8 text-center"
          data-testid="ceo-command-empty"
        >
          <h2 className="text-lg font-semibold text-white">Zatiaľ žiadne CEO notifikácie</h2>
          <p className="mt-2 text-sm text-slate-400">
            Riaditeľské notifikácie sa objavia po ďalšom behu rutín. Sekcie vyššie ostávajú z reálnych dát.
          </p>
        </div>
      ) : (
        <ul className="space-y-3" data-testid="ceo-command-list">
          {items.map((n) => {
            const unread = !n.read_at;
            return (
              <li
                key={n.id}
                data-testid={`ceo-command-item-${n.id}`}
                className={`rounded-xl border p-4 ${
                  unread ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/10 bg-slate-900/40 opacity-80"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  {unread ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Nové</span>
                  ) : null}
                  <span className="text-[10px] text-slate-400">{priorityLabel(n.priority)}</span>
                  <time className="text-xs text-slate-500">{formatWhen(n.created_at)}</time>
                </div>
                <h3 className="font-semibold text-white">{n.title}</h3>
                {n.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{n.body}</p> : null}
                {unread ? (
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    disabled={markingId === n.id}
                    className="mt-3 text-xs font-semibold text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                    data-testid={`ceo-command-mark-read-${n.id}`}
                  >
                    {markingId === n.id ? "Označujem…" : "Označiť ako prečítané"}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Prečítané</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
