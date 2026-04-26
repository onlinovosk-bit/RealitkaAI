"use client";

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-5 ${className}`}>{children}</div>;
}

export default function RevenueView() {
  const maxAreaValue = Math.max(
    ...chartData.flatMap((d) => [d["Avg Market Speed"], d["Revolis Alpha Speed"]]),
  );
  const totalGap = gapData.reduce((acc, g) => acc + g.value, 0);

  return (
    <section className="space-y-10 rounded-[2rem] border border-white/10 bg-[#010103] p-10 selection:bg-yellow-500/30">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter text-white">COMMAND CENTER</h2>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            Regional Intelligence: Prešov / Košice
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase text-slate-500">Live Market Pulse</p>
          <p className="font-mono text-xs text-emerald-500">88.4ms Response</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-white/5 bg-[#0a0a0b] ring-1 ring-blue-500/20">
          <p className="mb-2 text-[10px] font-black uppercase text-slate-500">Likvidita v Radare</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black italic text-white">1,42M €</p>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">
              +12%
            </span>
          </div>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0b] ring-1 ring-yellow-500/20">
          <p className="mb-2 text-[10px] font-black uppercase italic text-yellow-500/70">Protocol Opportunity Alerts</p>
          <p className="text-4xl font-black text-white">9 Alerts</p>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0b]">
          <p className="mb-2 text-[10px] font-black uppercase text-slate-500">Neural Prediction Accuracy</p>
          <p className="text-4xl font-black text-blue-500">94.8%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <Card className="border-white/5 bg-[#0a0a0b]">
          <h3 className="mb-8 text-center text-xs font-black uppercase italic tracking-widest text-white">
            Pipeline Velocity (Market Speed)
          </h3>
          <div className="space-y-4">
            {chartData.map((item) => (
              <div key={item.date}>
                <p className="mb-1 text-[10px] font-bold text-slate-400">{item.date}</p>
                <div className="flex gap-2">
                  <div className="h-3 flex-1 rounded bg-slate-800">
                    <div
                      className="h-3 rounded bg-slate-500"
                      style={{ width: `${(item["Avg Market Speed"] / maxAreaValue) * 100}%` }}
                    />
                  </div>
                  <div className="h-3 flex-1 rounded bg-slate-800">
                    <div
                      className="h-3 rounded bg-blue-500"
                      style={{ width: `${(item["Revolis Alpha Speed"] / maxAreaValue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-4 text-[10px] uppercase text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-500" /> Avg Market Speed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Revolis Alpha Speed
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-white/5 bg-[#0a0a0b]">
          <h3 className="mb-8 text-center text-xs font-black uppercase italic tracking-widest text-white">
            Demand/Supply Gap: PO-KE Area
          </h3>
          <div className="space-y-4">
            {gapData.map((item, idx) => {
              const colors = ["bg-blue-500", "bg-cyan-500", "bg-yellow-500", "bg-indigo-500"];
              const pct = Math.round((item.value / totalGap) * 100);
              return (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                    <span>{item.name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded bg-slate-800">
                    <div className={`h-2 rounded ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
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
