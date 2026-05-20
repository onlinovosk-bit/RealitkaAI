"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Loader2,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";
import { PlaybookFilterToggle } from "@/ui/playbook/PlaybookFilterToggle";
import { PlaybookSectionHeader } from "@/ui/playbook/PlaybookSectionHeader";
import { PlaybookItemCard } from "@/ui/playbook/PlaybookItemCard";
import { useEventStream } from "@/hooks/useEventStream";
import type { PlaybookItemDto } from "@/services/playbook/types";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import type { PlaybookItemType } from "@/ui/playbook/components.map";

type SummarySegment = "ALL" | PlaybookItemType;

const SECTION_CONFIG: Record<
  PlaybookItemType,
  {
    label: string;
    colorClass: string;
    Icon: typeof Phone;
  }
> = {
  CALL: {
    label: "Hovory",
    colorClass: "text-blue-700",
    Icon: Phone,
  },
  OPPORTUNITY: {
    label: "Na uzavretie",
    colorClass: "text-emerald-700",
    Icon: Flame,
  },
  MESSAGE: {
    label: "Správy",
    colorClass: "text-slate-700",
    Icon: MessageSquare,
  },
  RISK: {
    label: "Riziká",
    colorClass: "text-red-600",
    Icon: AlertTriangle,
  },
};

function TypeSectionHeader({
  type,
  count,
}: {
  type: PlaybookItemType;
  count: number;
}) {
  const { label, colorClass, Icon } = SECTION_CONFIG[type];

  return (
    <p className={`mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${colorClass}`}>
      <Icon className="h-4 w-4" aria-hidden />
      {label} ({count})
    </p>
  );
}

export default function PlaybookPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<"TODAY" | "WEEK">("TODAY");
  const [summarySegment, setSummarySegment] = useState<SummarySegment>("ALL");
  const [items, setItems] = useState<PlaybookItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { connected, messages } = useEventStream("/api/events/stream");
  const lastLive = [...messages]
    .reverse()
    .find(
      (m) =>
        m.type &&
        m.type !== "CONNECTED" &&
        m.type !== "POLL_ERROR"
    );

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/playbook?scope=${filter.toLowerCase()}`);
        const data = await res.json();
        // Backward/forward compatible parsing:
        // - older shape: { ok: true, result: { items: [...] } }
        // - current shape: { ok: true, items: [...] }
        setItems(data.result?.items ?? data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filter]);

  useEffect(() => {
    setSummarySegment("ALL");
  }, [filter]);

  const callItems        = items.filter((i) => i.type === "CALL");
  const messageItems     = items.filter((i) => i.type === "MESSAGE");
  const riskItems        = items.filter((i) => i.type === "RISK");
  const opportunityItems = items.filter((i) => i.type === "OPPORTUNITY");
  const hasMockItems = items.some((item) => item.leadId?.startsWith("mock-"));

  const showCalls =
    summarySegment === "ALL" || summarySegment === "CALL";
  const showOpportunities =
    summarySegment === "ALL" || summarySegment === "OPPORTUNITY";
  const showMessages =
    summarySegment === "ALL" || summarySegment === "MESSAGE";
  const showRisks =
    summarySegment === "ALL" || summarySegment === "RISK";

  useEffect(() => {
    if (summarySegment === "ALL") return;
    const anchorMap: Record<PlaybookItemType, string> = {
      CALL: "playbook-calls",
      OPPORTUNITY: "playbook-opportunities",
      MESSAGE: "playbook-messages",
      RISK: "playbook-risks",
    };
    const anchor = anchorMap[summarySegment];
    const t = window.setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
    return () => window.clearTimeout(t);
  }, [summarySegment]);

  const scrollToTopOfPlan = () => {
    requestAnimationFrame(() => {
      document.getElementById("playbook-summary-top")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSummaryRow = (type: PlaybookItemType, count: number) => {
    if (count === 0) return;
    setSummarySegment(type);
  };

  const withDemoBadge = (item: PlaybookItemDto): PlaybookItemDto => {
    const isMock = item.leadId?.startsWith("mock-");
    if (!isMock) return item;
    const badges = item.badges ?? [];
    if (badges.includes("DEMO")) return item;
    return { ...item, badges: [...badges, "DEMO"] };
  };

  const navigateToLead = (leadId: string) => {
    if (leadId.startsWith("mock-")) return;
    router.push(`/leads/${leadId}`);
  };

  const handlePlaybookCta = async (item: PlaybookItemDto) => {
    if (item.ctaLabel === "Potvrdiť" && item.type === "CALL") {
      setConfirmingId(item.id);
      try {
        const res = await fetch("/api/playbook/confirm-viewing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: item.leadId,
            playbookItemId: item.id,
            title: item.title,
            subtitle: item.subtitle,
            buyerName: item.buyerName,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          sent?: boolean;
          channel?: string;
          message?: string;
          fallback?: { mailtoHref?: string; smsHref?: string };
        };

        if (!res.ok || data.ok === false) {
          setToast(data.error ?? "Nepodarilo sa odoslať potvrdenie.");
          return;
        }

        if (data.sent) {
          setToast(
            data.channel === "email"
              ? "Potvrdenie odoslané emailom."
              : "Potvrdenie odoslané cez SMS."
          );
          return;
        }

        if (data.fallback?.mailtoHref) {
          window.location.assign(data.fallback.mailtoHref);
          setToast(data.message ?? "Otváram e-mailového klienta so správou.");
          return;
        }
        if (data.fallback?.smsHref) {
          window.location.assign(data.fallback.smsHref);
          setToast(data.message ?? "Otváram SMS so správou.");
          return;
        }

        setToast(data.message ?? "Potvrdenie nie je možné odoslať (chýba kontakt).");
      } catch {
        setToast("Chyba siete pri odosielaní potvrdenia.");
      } finally {
        setConfirmingId(null);
      }
      return;
    }

    navigateToLead(item.leadId);
  };

  return (
    <main className="flex h-full flex-col gap-4 bg-slate-50 p-3 text-slate-900 md:gap-6 md:p-6">
      {/* Header */}
      {toast && (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 shadow-sm"
        >
          {toast}
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              AI Plán krokov
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Denný plán práce, zoradený podľa Indexu pripravenosti kupujúceho. Žiadny prehľad, len konkrétne kroky.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: connected ? "#16A34A" : "#94A3B8" }}
            />
            <span
              className={`max-w-[220px] truncate text-xs font-medium ${
                connected ? "text-emerald-700" : "text-slate-500"
              }`}
              title={
                typeof lastLive?.type === "string" ? lastLive.type : undefined
              }
            >
              {connected
                ? lastLive?.type
                  ? String(lastLive.type)
                  : "Live · čakám na udalosť"
                : "Offline"}
            </span>
          </div>
          <PlaybookFilterToggle value={filter} onChange={setFilter} />
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Načítavam AI plán...
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" aria-hidden />
          <p className="text-sm text-slate-600">
            Všetky akcie sú splnené. Žiadne položky pre{" "}
            {filter === "TODAY" ? "dnešok" : "tento týždeň"}.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Hlavný stĺpec */}
          <section
            id="playbook-summary-top"
            className="col-span-2 scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {hasMockItems && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Zobrazené sú demo položky (označené značkou DEMO), kým nie sú dostupné živé dáta Indexu pripravenosti.
              </div>
            )}
            <PlaybookSectionHeader
              label="Dnešné akcie"
              description="Zoradené podľa Indexu pripravenosti a dopadu na obrat"
            />

            {summarySegment !== "ALL" && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-600">
                <span>
                  Zobrazený segment:{" "}
                  <span className="font-semibold text-blue-700">
                    {summarySegment === "CALL" && "Hovory"}
                    {summarySegment === "OPPORTUNITY" && "Na uzavretie"}
                    {summarySegment === "MESSAGE" && "Správy"}
                    {summarySegment === "RISK" && "Riziká"}
                  </span>
                </span>
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  onClick={() => setSummarySegment("ALL")}
                >
                  Zobraziť všetky segmenty
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Hovory */}
              {showCalls && callItems.length > 0 && (
                <div id="playbook-calls" className="scroll-mt-28">
                  <TypeSectionHeader type="CALL" count={callItems.length} />
                  {callItems.map((item) => (
                    <PlaybookItemCard
                      key={item.id}
                      {...withDemoBadge(item)}
                      onClick={() => void handlePlaybookCta(item)}
                      ctaLoading={confirmingId === item.id}
                    />
                  ))}
                </div>
              )}

              {/* Príležitosti */}
              {showOpportunities && opportunityItems.length > 0 && (
                <div id="playbook-opportunities" className="scroll-mt-28">
                  <TypeSectionHeader type="OPPORTUNITY" count={opportunityItems.length} />
                  {opportunityItems.map((item) => (
                    <PlaybookItemCard
                      key={item.id}
                      {...withDemoBadge(item)}
                      onClick={() => void handlePlaybookCta(item)}
                      ctaLoading={confirmingId === item.id}
                    />
                  ))}
                </div>
              )}

              {/* Správy */}
              {showMessages && messageItems.length > 0 && (
                <div id="playbook-messages" className="scroll-mt-28">
                  <TypeSectionHeader type="MESSAGE" count={messageItems.length} />
                  {messageItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => navigateToLead(item.leadId)} />
                  ))}
                </div>
              )}

              {/* Riziká */}
              {showRisks && riskItems.length > 0 && (
                <div id="playbook-risks" className="scroll-mt-28">
                  <TypeSectionHeader type="RISK" count={riskItems.length} />
                  {riskItems.map((item) => (
                    <PlaybookItemCard
                      key={item.id}
                      {...withDemoBadge(item)}
                      onClick={() => void handlePlaybookCta(item)}
                      ctaLoading={confirmingId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Pravý stĺpec – summary */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-700">
                Súhrn
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "Hovory",
                    count: callItems.length,
                    colorClass: "text-blue-700",
                    type: "CALL" as const,
                  },
                  {
                    label: "Na uzavretie",
                    count: opportunityItems.length,
                    colorClass: "text-emerald-700",
                    type: "OPPORTUNITY" as const,
                  },
                  {
                    label: "Správy",
                    count: messageItems.length,
                    colorClass: "text-slate-700",
                    type: "MESSAGE" as const,
                  },
                  {
                    label: "Riziká",
                    count: riskItems.length,
                    colorClass: "text-red-600",
                    type: "RISK" as const,
                  },
                ].map(({ label, count, colorClass, type }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={count === 0}
                    onClick={() => handleSummaryRow(type, count)}
                    className={`flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-default disabled:opacity-40 ${
                      summarySegment === type ? "bg-blue-50 ring-1 ring-blue-200" : ""
                    }`}
                  >
                    <span className="text-sm text-slate-600">
                      {label}
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${colorClass}`}>
                      {count}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`mt-1 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    summarySegment === "ALL" ? "bg-slate-100 ring-1 ring-slate-200" : ""
                  }`}
                  onClick={() => {
                    setSummarySegment("ALL");
                    window.setTimeout(() => scrollToTopOfPlan(), 50);
                  }}
                >
                  <span className="text-sm font-semibold text-slate-700">
                    Celkom
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-950">
                    {items.length}
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-700">
                {AI_ASSISTANT_NAME} radí
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                Začni hovory so záujemcom s najvyšším IPK. Záujemca s IPK 80+ volaný v deň signálu má{" "}
                <span className="font-semibold text-blue-700">3× vyššiu</span> šancu na uzavretie
                ako záujemca kontaktovaný po 5+ dňoch.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
