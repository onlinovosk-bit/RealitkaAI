"use client";

import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_KPI } from "@/lib/slate-horizon-theme";

const chartData = [
  { date: "W1", "Avg Market Speed": 24, "Revolis Alpha Speed": 20 },
  { date: "W2", "Avg Market Speed": 23, "Revolis Alpha Speed": 19 },
  { date: "W3", "Avg Market Speed": 22, "Revolis Alpha Speed": 17 },
  { date: "W4", "Avg Market Speed": 21, "Revolis Alpha Speed": 16 },
];

const gapData = [
  { name: "2i byty - deficit", value: 38 },
  { name: "3i byty - deficit", value: 27 },
  { name: "Domy - stabilné", value: 21 },
  { name: "Pozemky - rast", value: 14 },
];

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: accent ?? WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      {children}
    </div>
  );
}

export default function RevenueView() {
  const maxAreaValue = Math.max(
    ...chartData.flatMap((d) => [d["Avg Market Speed"], d["Revolis Alpha Speed"]]),
  );
  const totalGap = gapData.reduce((acc, g) => acc + g.value, 0);

  return (
    <section
      className="space-y-8 rounded-[2rem] border p-6 md:p-8"
      style={{
        background: WORKDESK_KPI.background,
        borderColor: WORKDESK_KPI.borderColor,
        boxShadow: WORKDESK_KPI.boxShadow,
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Revenue intelligence
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl" style={{ color: SLATE_HORIZON.ink }}>
            Kde vzniká príležitosť
          </h2>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Regionálny prehľad · Prešov / Košice
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Live market pulse
          </p>
          <p className="font-mono text-xs font-semibold" style={{ color: SLATE_HORIZON.greenDark }}>
            88.4ms response
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card accent={SLATE_HORIZON.softBorder}>
          <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Likvidita v Radare
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black md:text-4xl" style={{ color: SLATE_HORIZON.ink }}>
              1,42M €
            </p>
            <span
              className="rounded-full border px-2 py-1 text-xs font-bold"
              style={{
                borderColor: "#BBF7D0",
                background: "#ECFDF5",
                color: SLATE_HORIZON.greenDark,
              }}
            >
              +12%
            </span>
          </div>
        </Card>

        <Card accent="#FDE68A">
          <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.amber }}>
            Protocol opportunity alerts
          </p>
          <p className="text-3xl font-black md:text-4xl" style={{ color: SLATE_HORIZON.ink }}>
            9 Alerts
          </p>
        </Card>

        <Card>
          <p className="mb-2 text-[10px] font-bold uppercase" style={{ color: SLATE_HORIZON.muted }}>
            Neural prediction accuracy
          </p>
          <p className="text-3xl font-black md:text-4xl" style={{ color: SLATE_HORIZON.brandDeep }}>
            94.8%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-6 text-center text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.deep }}>
            Pipeline velocity (market speed)
          </h3>
          <div className="space-y-4">
            {chartData.map((item) => (
              <div key={item.date}>
                <p className="mb-1 text-[10px] font-bold" style={{ color: SLATE_HORIZON.muted }}>
                  {item.date}
                </p>
                <div className="flex gap-2">
                  <div className="h-3 flex-1 rounded" style={{ background: SLATE_HORIZON.line }}>
                    <div
                      className="h-3 rounded bg-slate-400"
                      style={{ width: `${(item["Avg Market Speed"] / maxAreaValue) * 100}%` }}
                    />
                  </div>
                  <div className="h-3 flex-1 rounded" style={{ background: SLATE_HORIZON.line }}>
                    <div
                      className="h-3 rounded"
                      style={{
                        width: `${(item["Revolis Alpha Speed"] / maxAreaValue) * 100}%`,
                        background: SLATE_HORIZON.brand,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] uppercase" style={{ color: SLATE_HORIZON.muted }}>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Avg market speed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: SLATE_HORIZON.brand }} /> Revolis alpha speed
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-6 text-center text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.deep }}>
            Demand/supply gap: PO-KE area
          </h3>
          <div className="space-y-4">
            {gapData.map((item, idx) => {
              const colors = [SLATE_HORIZON.brand, "#06B6D4", SLATE_HORIZON.amber, "#6366F1"];
              const pct = Math.round((item.value / totalGap) * 100);
              return (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: SLATE_HORIZON.deep }}>
                    <span>{item.name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded" style={{ background: SLATE_HORIZON.line }}>
                    <div
                      className="h-2 rounded"
                      style={{ width: `${pct}%`, background: colors[idx % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}
