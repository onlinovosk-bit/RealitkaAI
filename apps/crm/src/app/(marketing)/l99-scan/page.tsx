import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revolis.AI | L99 Engine — Maximalizujte výnosový potenciál databázy",
  description:
    "Revolis.AI L99 identifikuje latentné predajné príležitosti vo vašom archíve skôr, než sa stanú verejnou ponukou. Ovládnite trh cez exkluzívne mandáty.",
  robots: { index: false, follow: false },
};

const UTM_LINK =
  "https://app.revolis.ai/register?utm_source=email&utm_medium=direct-outreach&utm_campaign=smolko_reality&utm_content=l99_enterprise_v3";

const OLD_WAY = [
  "Čakanie na dopyt z portálov — v tej chvíli klient volá všetkým.",
  "Súťaž o nízku províziu v konkurenčnom prostredí.",
  "80 % CRM databázy je mŕtvy kapitál bez aktívneho sledovania.",
];

const L99_WAY = [
  {
    label: "Exkluzivita:",
    text: "Identifikácia zámeru predať týždne pred prvým inzerátom.",
  },
  {
    label: "Ochrana marže:",
    text: "Budovanie vzťahu v čase, kedy neexistuje žiadna konkurencia.",
  },
  {
    label: "AI Audit výkonnosti:",
    text: "Automatický monitoring správania vašich top kontaktov 24/7.",
  },
];

const STATS = [
  { value: "+35 %", label: "Nárast efektivity naberania mandátov" },
  { value: "0 %", label: "Konkurencia pri oslovení predikovaných kontaktov" },
  { value: "24/7", label: "AI Monitoring vašich najcennejších aktív" },
];

export default function L99ScanPage() {
  return (
    <>
      <style>{`
        .l99-btn {
          display: inline-block;
          padding: 20px 48px;
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #fff;
          background: linear-gradient(135deg, #2563EB, #06B6D4);
          border-radius: 12px;
          text-decoration: none;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0 40px rgba(37,99,235,0.4);
          position: relative;
          overflow: hidden;
        }
        .l99-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 0 60px rgba(37,99,235,0.6);
        }
        .l99-btn::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 14px;
          background: linear-gradient(135deg, #60A5FA, #22D3EE);
          opacity: 0.3;
          filter: blur(4px);
          animation: pulse 2s ease-in-out infinite;
          z-index: -1;
        }
        @media (max-width: 640px) {
          .l99-btn { padding: 16px 28px; font-size: 15px; }
        }
      `}</style>

      <main style={{ background: "#050509", color: "#fff", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>

        {/* ── 1. HERO ── */}
        <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
          {/* Glow */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-full blur-3xl"
            style={{ background: "linear-gradient(to bottom, rgba(37,99,235,0.12), transparent)", opacity: 0.6 }}
          />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            {/* Badge */}
            <div
              className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
              style={{ background: "rgba(37,99,235,0.10)", borderColor: "rgba(37,99,235,0.25)", color: "#60A5FA" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              L99 Engine Core: Produkčné nasadenie · Región SK-CE-1
            </div>

            {/* Headline */}
            <h1
              className="mb-8 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl"
              style={{
                background: "linear-gradient(135deg, #fff 40%, #60A5FA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Maximalizujte výnosový potenciál<br className="hidden md:block" />{" "}
              vašej klientskej databázy.
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mb-12 max-w-3xl text-lg leading-relaxed sm:text-xl" style={{ color: "#94A3B8" }}>
              Revolis.AI L99 identifikuje latentné predajné príležitosti vo vašom
              archíve skôr, než sa stanú verejnou ponukou. Ovládnite trh cez
              exkluzívne mandáty.
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4">
              <a href={UTM_LINK} className="l99-btn">
                Požiadať o ukážku prediktívneho modelu
              </a>
              <p className="text-sm italic" style={{ color: "#52525B" }}>
                Bezpečná demonštrácia na anonymizovaných dátach z vášho regiónu.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. POROVNANIE ── */}
        <section className="px-4 py-24 sm:px-6" style={{ background: "#080810" }}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold sm:text-5xl">
                Prečo tradičné CRM majiteľom nestačí?
              </h2>
              <p style={{ color: "#94A3B8" }}>
                Rozdiel medzi reaktívnym čakaním na dopyt a proaktívnym ovládaním trhu.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Starý spôsob */}
              <div
                className="rounded-2xl p-8"
                style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
              >
                <h3 className="mb-6 text-xl font-semibold" style={{ color: "#CBD5E1" }}>
                  Reaktívny model — Tradičná RK
                </h3>
                <ul className="space-y-4" style={{ color: "#94A3B8" }}>
                  {OLD_WAY.map((text) => (
                    <li key={text} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 text-red-500">✕</span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* L99 spôsob */}
              <div
                className="relative overflow-hidden rounded-2xl p-8"
                style={{ border: "1px solid rgba(37,99,235,0.35)", background: "rgba(37,99,235,0.05)" }}
              >
                <div
                  className="absolute right-0 top-0 rounded-bl-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{ background: "#2563EB" }}
                >
                  L99 Advantage
                </div>
                <h3 className="mb-6 text-xl font-semibold" style={{ color: "#60A5FA" }}>
                  Proaktívny model — Revolis L99
                </h3>
                <ul className="space-y-4 text-white">
                  {L99_WAY.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: "#3B82F6" }}>✓</span>
                      <span>
                        <strong style={{ color: "#BAE6FD" }}>{item.label}</strong>{" "}
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. ROI ČÍSLA ── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl border-t pt-20 text-center" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 className="mb-12 text-3xl font-bold italic">
              "Prestaňte kupovať dopyty, začnite vlastniť trh."
            </h2>
            <div className="grid grid-cols-1 gap-10 text-left sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.value}>
                  <div className="mb-2 text-4xl font-extrabold" style={{ color: "#3B82F6" }}>
                    {s.value}
                  </div>
                  <p className="text-sm uppercase tracking-tight" style={{ color: "#71717A" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-16 flex flex-col items-center gap-4">
              <a href={UTM_LINK} className="l99-btn">
                Zistiť hodnotu spiacich kontraktov
              </a>
              <p className="text-xs" style={{ color: "#52525B" }}>
                Bezplatná analýza · Pre majiteľov RK · Výsledok do 24 h · GDPR
              </p>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
