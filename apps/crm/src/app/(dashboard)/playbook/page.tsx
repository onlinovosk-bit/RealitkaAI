"use client";

import { useEffect, useState } from "react";
import { PlaybookFilterToggle } from "@/ui/playbook/PlaybookFilterToggle";
import { PlaybookSectionHeader } from "@/ui/playbook/PlaybookSectionHeader";
import { PlaybookItemCard } from "@/ui/playbook/PlaybookItemCard";
import { useEventStream } from "@/hooks/useEventStream";
import type { PlaybookItemDto } from "@/services/playbook/types";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

export default function PlaybookPage() {
  const [filter, setFilter] = useState<"TODAY" | "WEEK">("TODAY");
  const [items, setItems] = useState<PlaybookItemDto[]>([]);
  const [loading, setLoading] = useState(false);
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

  const callItems        = items.filter((i) => i.type === "CALL");
  const messageItems     = items.filter((i) => i.type === "MESSAGE");
  const riskItems        = items.filter((i) => i.type === "RISK");
  const opportunityItems = items.filter((i) => i.type === "OPPORTUNITY");
  const hasMockItems = items.some((item) => item.leadId?.startsWith("mock-"));

  const withDemoBadge = (item: PlaybookItemDto): PlaybookItemDto => {
    const isMock = item.leadId?.startsWith("mock-");
    if (!isMock) return item;
    const badges = item.badges ?? [];
    if (badges.includes("DEMO")) return item;
    return { ...item, badges: [...badges, "DEMO"] };
  };

  return (
    <main className="flex h-full flex-col gap-6 p-6" style={{ background: "#050914" }}>
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <RadiantSpriteIcon icon="playbook" sizeClassName="h-12 w-12" className="mt-0.5" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#F0F9FF" }}>
              AI Plán krokov
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Denný plán práce, zoradený podľa Indexu pripravenosti kupujúceho. Žiadny prehľad, len konkrétne kroky.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: connected ? "#22D3EE" : "#475569",
                boxShadow: connected ? "0 0 6px #22D3EE" : "none",
              }}
            />
            <span
              className="max-w-[220px] truncate text-xs"
              style={{ color: connected ? "#22D3EE" : "#475569" }}
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
        <div className="flex items-center gap-2 text-sm" style={{ color: "#475569" }}>
          <span className="animate-spin">⏳</span>
          Načítavam AI plán…
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: "#0A1628", borderColor: "#112240" }}
        >
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Všetky akcie sú splnené. Žiadne položky pre{" "}
            {filter === "TODAY" ? "dnešok" : "tento týždeň"}.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Hlavný stĺpec */}
          <section
            className="col-span-2 rounded-2xl border p-5"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
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
                Zobrazené sú demo položky (označené badgeom DEMO), kým nie sú dostupné živé dáta Indexu pripravenosti.
              </div>
            )}
            <PlaybookSectionHeader
              label="Dnešné akcie"
              description="Zoradené podľa Indexu pripravenosti a dopadu na obrat"
            />

            <div className="flex flex-col gap-3">
              {/* Hovory */}
              {callItems.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: "#22D3EE" }}>
                    📞 Hovory ({callItems.length})
                  </p>
                  {callItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => console.log("Hovor:", item.leadId)} />
                  ))}
                </>
              )}

              {/* Príležitosti */}
              {opportunityItems.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: "#FCD34D" }}>
                    🔥 Na uzavretie ({opportunityItems.length})
                  </p>
                  {opportunityItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => console.log("Príležitosť:", item.leadId)} />
                  ))}
                </>
              )}

              {/* Správy */}
              {messageItems.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: "#818CF8" }}>
                    💬 Správy ({messageItems.length})
                  </p>
                  {messageItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => console.log("Správa:", item.leadId)} />
                  ))}
                </>
              )}

              {/* Riziká */}
              {riskItems.length > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: "#FCA5A5" }}>
                    ⚠️ Riziká ({riskItems.length})
                  </p>
                  {riskItems.map((item) => (
                    <PlaybookItemCard key={item.id} {...withDemoBadge(item)} onClick={() => console.log("Riziko:", item.leadId)} />
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Pravý stĺpec – summary */}
          <aside className="flex flex-col gap-4">
            <div
              className="rounded-2xl border p-5"
              style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#1D4ED8" }}>
                Súhrn
              </p>
              <div className="space-y-3">
                {[
                  { label: "Hovory", count: callItems.length, color: "#22D3EE" },
                  { label: "Na uzavretie", count: opportunityItems.length, color: "#FCD34D" },
                  { label: "Správy", count: messageItems.length, color: "#818CF8" },
                  { label: "Riziká", count: riskItems.length, color: "#FCA5A5" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "#64748B" }}>{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>{count}</span>
                  </div>
                ))}
                <div
                  className="mt-3 pt-3 flex items-center justify-between"
                  style={{ borderTop: "1px solid #0F1F3D" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Celkom</span>
                  <span className="text-sm font-bold" style={{ color: "#F0F9FF" }}>{items.length}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                background: "rgba(34,211,238,0.04)",
                borderColor: "rgba(34,211,238,0.12)",
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#22D3EE" }}>
                {AI_ASSISTANT_NAME} radí
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
                Začni hovory so záujemcom s najvyšším IPK. Záujemca s IPK 80+ volaný v deň signálu má{" "}
                <span style={{ color: "#22D3EE" }}>3× vyššiu</span> šancu na uzavretie
                ako záujemca kontaktovaný po 5+ dňoch.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
