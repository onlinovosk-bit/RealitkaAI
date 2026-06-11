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

type LoadState = "loading" | "ready" | "empty" | "error";

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
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/ceo-command", { credentials: "include" });
      if (!res.ok) {
        setState("error");
        return;
      }
      const json = (await res.json()) as { notifications?: CeoNotification[] };
      const list = json.notifications ?? [];
      setItems(list);
      setState(list.length === 0 ? "empty" : "ready");
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

  if (state === "empty") {
    return (
      <div
        className="rounded-xl border border-dashed border-white/15 bg-slate-900/30 p-10 text-center space-y-3"
        data-testid="ceo-command-empty"
      >
        <div className="text-4xl" aria-hidden>📋</div>
        <h2 className="text-lg font-semibold text-white">Zatiaľ žiadne CEO príkazy</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Keď rutiny vygenerujú riaditeľský brief alebo týždenný výkon, objaví sa tu.
          Zatiaľ nemáte žiadne záznamy typu CEO Command.
        </p>
      </div>
    );
  }

  return (
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
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              {unread ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Nové</span>
              ) : null}
              <span className="text-[10px] text-slate-400">{priorityLabel(n.priority)}</span>
              <time className="text-xs text-slate-500">{formatWhen(n.created_at)}</time>
            </div>
            <h3 className="font-semibold text-white">{n.title}</h3>
            {n.body ? <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{n.body}</p> : null}
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
  );
}
