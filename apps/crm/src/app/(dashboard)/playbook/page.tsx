"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlaybookFilterToggle } from "@/ui/playbook/PlaybookFilterToggle";
import { PlaybookSectionHeader } from "@/ui/playbook/PlaybookSectionHeader";
import { PlaybookItemCard } from "@/ui/playbook/PlaybookItemCard";
import { useEventStream } from "@/hooks/useEventStream";
import type { PlaybookItemDto } from "@/services/playbook/types";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";
import type { PlaybookItemType } from "@/ui/playbook/components.map";

type SummarySegment = "ALL" | PlaybookItemType;

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
    <main className="flex h-full flex-col gap-4 p-3 md:gap-6 md:p-6" style={{ background: SLATE_HORIZON.bg }}>
      {/* Header */}
      {toast && (
        <div
          role="status"
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            background: SLATE_HORIZON.soft,
            borderColor: SLATE_HORIZON.softBorder,
            color: SLATE_HORIZON.brandDeep,
          }}
        >
          {toast}
        </div>
      )}

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <RadiantSpriteIcon icon="playbook" sizeClassName="h-12 w-12" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
              AI Plán krokov
            </h1>
            <p className="mt-1 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Denný plán práce, zoradený podľa Indexu pripravenosti kupujúceho. Žiadny prehľad, len konkrétne kroky.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: connected ? SLATE_HORIZON.brand : SLATE_HORIZON.muted,
                boxShadow: connected ? `0 0 6px ${SLATE_HORIZON.brand}` : "none",
              }}
            />
            <span
              className="max-w-[220px] truncate text-xs"
              style={{ color: connected ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.muted }}
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
        <div className="flex items-center gap-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          <span className="animate-spin">⏳</span>
          Načítavam AI plán…
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
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
            className="col-span-2 scroll-mt-28 rounded-2xl border p-5"
            style={{
              background: WORKDESK_CARD.background,
              borderColor: WORKDESK_CARD.borderColor,
              boxShadow: WORKDESK_CARD.boxShadow,
            }}
          >
            {hasMockItems && (
              <div
                className="mb-4 rounded-xl border px-3 py-2 text-xs"
                style={{
                  background: "rgba(250, 204, 21, 0.08)",
                  borderColor: "rgba(250, 204, 21, 0.22)",
                  color: "#FDE68A",
                }}
              >
                Zobrazené sú demo položky (označené značkou DEMO), kým nie sú dostupné živé dáta Indexu pripravenosti.
              </div>
            )}
            <PlaybookSectionHeader
              label="Dnešné akcie"
              description="Zoradené podľa Indexu pripravenosti a dopadu na obrat"
            />

            {summarySegment !== "ALL" && (
              <div
                className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
                style={{
                  background: SLATE_HORIZON.soft,
                  borderColor: SLATE_HORIZON.softBorder,
                  color: SLATE_HORIZON.muted,
                }}
              >
                <span>
                  Zobrazený segment:{" "}
                  <span className="font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
                    {summarySegment === "CALL" && "Hovory"}
                    {summarySegment === "OPPORTUNITY" && "Na uzavretie"}
                    {summarySegment === "MESSAGE" && "Správy"}
                    {summarySegment === "RISK" && "Riziká"}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 font-semibold hover:opacity-80"
                  style={{ color: SLATE_HORIZON.brand }}
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
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: SLATE_HORIZON.brand }}>
                    📞 Hovory ({callItems.length})
                  </p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: SLATE_HORIZON.warning }}>
                    🔥 Na uzavretie ({opportunityItems.length})
                  </p>
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
              {messageItems.length > 0 && (
                <div id="playbook-messages">
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: SLATE_HORIZON.brandNavy }}>
                    💬 Správy ({messageItems.length})
                  </p>
                  {messageItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => navigateToLead(item.leadId)} />
                  ))}
                </div>
              )}

              {/* Riziká */}
              {showRisks && riskItems.length > 0 && (
                <div id="playbook-risks" className="scroll-mt-28">
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: SLATE_HORIZON.danger }}>
                    ⚠️ Riziká ({riskItems.length})
                  </p>
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
            <div
              className="rounded-2xl border p-5"
              style={{
                background: WORKDESK_CARD.background,
                borderColor: WORKDESK_CARD.borderColor,
                boxShadow: WORKDESK_CARD.boxShadow,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: SLATE_HORIZON.brandDeep }}>
                Súhrn
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "Hovory",
                    count: callItems.length,
                    color: SLATE_HORIZON.brand,
                    type: "CALL" as const,
                  },
                  {
                    label: "Na uzavretie",
                    count: opportunityItems.length,
                    color: SLATE_HORIZON.warning,
                    type: "OPPORTUNITY" as const,
                  },
                  {
                    label: "Správy",
                    count: messageItems.length,
                    color: SLATE_HORIZON.brandNavy,
                    type: "MESSAGE" as const,
                  },
                  {
                    label: "Riziká",
                    count: riskItems.length,
                    color: SLATE_HORIZON.danger,
                    type: "RISK" as const,
                  },
                ].map(({ label, count, color, type }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={count === 0}
                    onClick={() => handleSummaryRow(type, count)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-40"
                    style={
                      summarySegment === type
                        ? {
                            background: SLATE_HORIZON.soft,
                            boxShadow: `inset 0 0 0 1px ${SLATE_HORIZON.softBorder}`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
                      {label}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>
                      {count}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="mt-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors"
                  style={
                    summarySegment === "ALL"
                      ? {
                          background: SLATE_HORIZON.soft,
                          boxShadow: `inset 0 0 0 1px ${WORKDESK_CARD.borderColor}`,
                        }
                      : undefined
                  }
                  onClick={() => {
                    setSummarySegment("ALL");
                    window.setTimeout(() => scrollToTopOfPlan(), 50);
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: SLATE_HORIZON.muted }}>
                    Celkom
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: SLATE_HORIZON.ink }}>
                    {items.length}
                  </span>
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                background: SLATE_HORIZON.soft,
                borderColor: SLATE_HORIZON.softBorder,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: SLATE_HORIZON.brandDeep }}>
                {AI_ASSISTANT_NAME} radí
              </p>
              <p className="text-sm leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
                Začni hovory so záujemcom s najvyšším IPK. Záujemca s IPK 80+ volaný v deň signálu má{" "}
                <span className="font-semibold" style={{ color: SLATE_HORIZON.brand }}>3× vyššiu</span> šancu na uzavretie
                ako záujemca kontaktovaný po 5+ dňoch.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
