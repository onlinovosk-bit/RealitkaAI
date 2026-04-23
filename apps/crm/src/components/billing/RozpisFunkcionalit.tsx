"use client";

// ─── Dáta ─────────────────────────────────────────────────────────────────

type CellValue = boolean | string;

type Row = {
  label: string;
  cells: [CellValue, CellValue, CellValue, CellValue]; // starter, pro, market, protocol
};

type Section = { title: string; rows: Row[] };

const Y = true;
const N = false;

const SECTIONS: Section[] = [
  {
    title: "Licencie a prístup",
    rows: [
      { label: "Počet maklérov",              cells: ["1 maklér", "1 maklér", "1 owner + 1", "1 owner + 4"] },
      { label: "Owner dashboard",             cells: [N, N, Y, Y] },
      { label: "Správa tímu",                 cells: [N, N, Y, Y] },
    ],
  },
  {
    title: "AI Asistent",
    rows: [
      { label: "Ranný AI briefing (8:00)",    cells: [Y, Y, Y, Y] },
      { label: "AI odpovede 24/7",            cells: ["Prac. hodiny", Y, Y, Y] },
      { label: "Buyer Readiness Index",       cells: [Y, Y, Y, Y] },
      { label: "Prediktívny deal scoring",    cells: [N, Y, Y, Y] },
      { label: "AI Ghostwriter (správy)",     cells: [N, Y, Y, Y] },
      { label: "Automatické follow-upy",      cells: [N, Y, Y, Y] },
      { label: "Analýza hovorov",             cells: [N, Y, Y, Y] },
    ],
  },
  {
    title: "L99 Intelligence",
    rows: [
      { label: "Kataster radar",              cells: [N, Y, Y, Y] },
      { label: "Register úpadcov",            cells: [N, Y, Y, Y] },
      { label: "Stavebné povolenia",          cells: [N, Y, Y, Y] },
      { label: "Ghost Resurrection",          cells: [N, N, Y, Y] },
      { label: "Register závierok (B2B)",     cells: [N, N, Y, Y] },
      { label: "Bio-Social demografika",      cells: [N, N, N, Y] },
      { label: "Competition Heatmap",         cells: [N, N, N, Y] },
      { label: "Ghost Mode Shield",           cells: [N, N, N, Y] },
    ],
  },
  {
    title: "Podpora a SLA",
    rows: [
      { label: "Email podpora",               cells: [Y, Y, Y, Y] },
      { label: "Prioritná podpora",           cells: [N, N, Y, Y] },
      { label: "Dedikovaný Protocol Manager", cells: [N, N, N, Y] },
      { label: "SLA uptime garancia",         cells: ["99.5%", "99.5%", "99.9%", "99.99%"] },
      { label: "30-dňová garancia vrátenia",  cells: [Y, Y, Y, Y] },
    ],
  },
];

const PLANS = [
  { name: "Smart Start",        price: "49 €",  featured: false, color: "#64748B" },
  { name: "Active Force",       price: "99 €",  featured: false, color: "#818CF8" },
  { name: "Market Vision",      price: "199 €", featured: true,  color: "#5AAF3C" },
  { name: "Protocol Authority", price: "449 €", featured: false, color: "#34D399" },
];

// ─── Cell renderer ────────────────────────────────────────────────────────

function Cell({ value, featured }: { value: CellValue; featured: boolean }) {
  const bg      = featured ? "rgba(90,175,60,0.06)" : "transparent";
  const border  = featured ? "0 1px solid rgba(90,175,60,0.18)" : undefined;

  if (value === true) {
    return (
      <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined, borderRight: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined }}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "rgba(90,175,60,0.15)" }}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="#5AAF3C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      </td>
    );
  }

  if (value === false) {
    return (
      <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined, borderRight: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined }}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="#334155" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </span>
      </td>
    );
  }

  return (
    <td className="py-2.5 px-3 text-center" style={{ background: bg, borderLeft: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined, borderRight: featured ? "0.5px solid rgba(90,175,60,0.18)" : undefined }}>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
        style={{ background: featured ? "rgba(90,175,60,0.15)" : "rgba(255,255,255,0.06)", color: featured ? "#5AAF3C" : "#64748B" }}
      >
        {value}
      </span>
    </td>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export default function RozpisFunkcionalit() {
  return (
    <div className="min-h-screen bg-[#010103] text-slate-200 pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white mb-3">
            ROZPIS <span className="text-blue-500">FUNKCIONALÍT</span>
          </h1>
          <p className="text-slate-500 text-sm uppercase tracking-wider">
            Kompletný prehľad čo obsahuje každý program
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full border-collapse" style={{ minWidth: 640 }}>

            {/* Plan headers */}
            <thead>
              <tr>
                <th className="w-[200px] p-0" />
                {PLANS.map((plan) => (
                  <th key={plan.name} className="p-0 text-center" style={{ minWidth: 130 }}>
                    <div
                      className="px-3 py-5 relative"
                      style={{
                        background:   plan.featured ? "rgba(90,175,60,0.08)" : "rgba(255,255,255,0.02)",
                        borderLeft:   plan.featured ? "0.5px solid rgba(90,175,60,0.30)" : undefined,
                        borderRight:  plan.featured ? "0.5px solid rgba(90,175,60,0.30)" : undefined,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {plan.featured && (
                        <div
                          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap"
                          style={{ background: "#5AAF3C", color: "#010103" }}
                        >
                          Odporúčané
                        </div>
                      )}
                      <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: plan.color }}>
                        {plan.name}
                      </div>
                      <div className="text-xl font-black text-white">
                        {plan.price}
                        <span className="text-[10px] text-slate-500 font-normal"> / mes</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {SECTIONS.map((section) => (
                <>
                  {/* Section header */}
                  <tr key={`s-${section.title}`} style={{ background: "rgba(90,175,60,0.06)" }}>
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "#3B6D11", borderBottom: "0.5px solid rgba(90,175,60,0.15)" }}
                    >
                      {section.title}
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {section.rows.map((row, ri) => (
                    <tr
                      key={row.label}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: "0.5px solid rgba(255,255,255,0.04)" }}
                    >
                      <td className="py-2.5 px-4 text-xs text-slate-400">
                        {row.label}
                      </td>
                      {row.cells.map((cell, ci) => (
                        <Cell key={ci} value={cell} featured={PLANS[ci].featured} />
                      ))}
                    </tr>
                  ))}
                </>
              ))}

              {/* Footer CTA row */}
              <tr>
                <td />
                {PLANS.map((plan) => (
                  <td
                    key={plan.name}
                    className="px-3 py-4 text-center"
                    style={{
                      background:  plan.featured ? "rgba(90,175,60,0.08)" : undefined,
                      borderLeft:  plan.featured ? "0.5px solid rgba(90,175,60,0.30)" : undefined,
                      borderRight: plan.featured ? "0.5px solid rgba(90,175,60,0.30)" : undefined,
                      borderTop:   "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <a
                      href="/billing"
                      className="block w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-80"
                      style={
                        plan.featured
                          ? { background: "#3B6D11", color: "#EAF3DE" }
                          : { border: "0.5px solid rgba(255,255,255,0.12)", color: "#64748B" }
                      }
                    >
                      Začať ↗
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
