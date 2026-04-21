import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revolis.AI | L99 Engine — Skenovanie databázy",
  description:
    "Identifikujte klientov, ktorí sa chystajú predať, skôr než oslovia konkurenciu. Revolis.AI L99 Engine analyzuje vašu databázu zadarmo.",
  robots: { index: false, follow: false },
};

const UTM_LINK =
  "https://app.revolis.ai/register?utm_source=email&utm_medium=direct-outreach&utm_campaign=smolko_reality&utm_content=conversion_focus";

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
          background: linear-gradient(135deg, #007BFF, #00F2FE);
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,123,255,0.30);
          position: relative;
          z-index: 2;
        }
        .l99-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(0,123,255,0.50);
          background: linear-gradient(135deg, #00F2FE, #007BFF);
        }
        @media (max-width: 640px) {
          .l99-btn { padding: 16px 32px; font-size: 16px; }
        }
      `}</style>

      <main
        className="flex min-h-screen items-center justify-center px-5 py-20"
        style={{ background: "#050509" }}
      >
        {/* Ambient glow */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-[160px]"
            style={{ background: "rgba(0,123,255,0.08)" }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full blur-[100px]"
            style={{ background: "rgba(0,242,254,0.06)" }}
          />
        </div>

        <section className="relative z-10 w-full max-w-3xl text-center">
          {/* Urgency badge */}
          <div
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium"
            style={{
              background: "rgba(0,123,255,0.10)",
              borderColor: "rgba(0,123,255,0.30)",
              color: "#00F2FE",
              boxShadow: "0 4px 15px rgba(0,242,254,0.10)",
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{ background: "#28a745", boxShadow: "0 0 10px #28a745" }}
            />
            Aktuálne analyzujeme 14&nbsp;200+ dátových bodov v Prešovskom kraji
          </div>

          {/* Headline */}
          <h1
            className="mb-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-[56px]"
            style={{
              background: "linear-gradient(135deg, #ECECF1 30%, #4FACFE)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Získajte o 30&nbsp;% viac naberaní
            <br className="hidden sm:block" />
            {" "}z vašej existujúcej databázy.
          </h1>

          {/* Subtitle */}
          <p
            className="mx-auto mb-12 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: "#A1A1AA" }}
          >
            Revolis.AI L99 Engine identifikuje klientov, ktorí sa chystajú predať,
            skôr než oslovia konkurenciu. Prestaňte strácať provízie, ktoré už vlastníte.
          </p>

          {/* CTA button with pulse ring */}
          <div className="relative inline-block">
            <a href={UTM_LINK} className="l99-btn">
              Skenovať moju databázu zadarmo
            </a>
            <div className="btn-pulse-ring" aria-hidden="true" />
          </div>

          {/* Trust strip */}
          <p className="mt-8 text-xs" style={{ color: "#52525b" }}>
            Bez kreditnej karty · GDPR · Vyrobené na Slovensku 🇸🇰
          </p>
        </section>
      </main>
    </>
  );
}
