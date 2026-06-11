"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  countUnread,
  filterInboxNotifications,
  formatInboxWhen,
  priorityLabel,
  type InboxFilter,
  type InboxNotification,
  type InboxScope,
  typeLabel,
} from "./notification-inbox-types";

type LoadState = "idle" | "loading" | "ready" | "error";

const FILTER_OPTIONS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "Všetko" },
  { value: "unread", label: "Neprečítané" },
  { value: "read", label: "Prečítané" },
];

function emptyStateCopy(scope: InboxScope): { title: string; body: string } {
  if (scope === "owner") {
    return {
      title: "Zatiaľ žiadne notifikácie",
      body:
        "Keď rutiny vygenerujú upozornenie pre vašu agentúru (Seller Rescue, CEO Command, týždenný výkon), zobrazí sa tu. Zatiaľ nemáte žiadne záznamy.",
    };
  }
  return {
    title: "Zatiaľ žiadne notifikácie",
    body:
      "Keď rutiny vygenerujú upozornenie priamo pre vás (Seller Rescue, riziko obchodu), zobrazí sa tu. Zatiaľ nemáte žiadne záznamy.",
  };
}

export default function NotificationInboxBell() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [scope, setScope] = useState<InboxScope>("agent");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/notifications/inbox", { credentials: "include" });
      if (!res.ok) {
        setLoadState("error");
        return;
      }
      const json = (await res.json()) as {
        notifications?: InboxNotification[];
        scope?: InboxScope;
      };
      setItems(json.notifications ?? []);
      setScope(json.scope ?? "agent");
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (open && loadState === "idle") {
      void load();
    }
  }, [open, loadState, load]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function markRead(id: string) {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
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

  const unreadCount = countUnread(items);
  const visible = filterInboxNotifications(items, filter);
  const emptyCopy = emptyStateCopy(scope);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifikácie"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-testid="notification-inbox-bell"
        style={{
          position: "relative",
          width: 38,
          height: 38,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        <Bell size={18} aria-hidden />
        {unreadCount > 0 ? (
          <span
            data-testid="notification-inbox-badge"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: "#F97316",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              padding: "0 4px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Panel notifikácií"
          data-testid="notification-inbox-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxWidth: "min(380px, 92vw)",
            maxHeight: 480,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            background: "#fff",
            boxShadow: "0 16px 48px rgba(15,23,42,0.18)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0F172A" }}>
              Notifikácie
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loadState === "loading"}
              data-testid="notification-inbox-refresh"
              style={{
                border: 0,
                background: "transparent",
                color: "#2563EB",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                opacity: loadState === "loading" ? 0.5 : 1,
              }}
            >
              Obnoviť
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Filter notifikácií"
            style={{
              display: "flex",
              gap: 6,
              padding: "10px 12px",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            {FILTER_OPTIONS.map((opt) => {
              const active = filter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`notification-inbox-filter-${opt.value}`}
                  onClick={() => setFilter(opt.value)}
                  style={{
                    border: active ? "1px solid #BFDBFE" : "1px solid #E2E8F0",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: active ? "#EFF6FF" : "#fff",
                    color: active ? "#1D4ED8" : "#64748B",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {loadState === "loading" ? (
              <p
                className="text-sm text-slate-500"
                data-testid="notification-inbox-loading"
              >
                Načítavam notifikácie…
              </p>
            ) : null}

            {loadState === "error" ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-center"
                data-testid="notification-inbox-error"
              >
                <p className="text-sm text-red-700">Nepodarilo sa načítať notifikácie.</p>
              </div>
            ) : null}

            {loadState === "ready" && items.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2"
                data-testid="notification-inbox-empty"
              >
                <div className="text-3xl" aria-hidden>
                  🔔
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{emptyCopy.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{emptyCopy.body}</p>
              </div>
            ) : null}

            {loadState === "ready" && items.length > 0 && visible.length === 0 ? (
              <p
                className="text-sm text-slate-500 text-center py-6"
                data-testid="notification-inbox-filter-empty"
              >
                V tomto filtri nie sú žiadne notifikácie.
              </p>
            ) : null}

            {loadState === "ready" && visible.length > 0 ? (
              <ul className="space-y-2" data-testid="notification-inbox-list">
                {visible.map((n) => {
                  const unread = !n.read_at;
                  return (
                    <li
                      key={n.id}
                      data-testid={`notification-inbox-item-${n.id}`}
                      className={`rounded-lg border p-3 ${
                        unread
                          ? "border-blue-200 bg-blue-50/60"
                          : "border-slate-200 bg-white opacity-85"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {typeLabel(n.type)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {priorityLabel(n.priority)}
                        </span>
                        <time className="text-[10px] text-slate-400 w-full">
                          {formatInboxWhen(n.created_at)}
                        </time>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                      {n.body ? (
                        <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap line-clamp-3">
                          {n.body}
                        </p>
                      ) : null}
                      {unread ? (
                        <button
                          type="button"
                          onClick={() => void markRead(n.id)}
                          disabled={markingId === n.id}
                          data-testid={`notification-inbox-mark-read-${n.id}`}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {markingId === n.id ? "Označujem…" : "Označiť ako prečítané"}
                        </button>
                      ) : (
                        <p
                          className="mt-1 text-[10px] text-slate-400"
                          data-testid={`notification-inbox-read-label-${n.id}`}
                        >
                          Prečítané
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
