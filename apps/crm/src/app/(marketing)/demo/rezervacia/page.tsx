import { Metadata } from "next";
import DemoRequestForm from "@/components/demo/demo-request-form";
import LegalFooter from "@/components/marketing/LegalFooter";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export const metadata: Metadata = {
  title: "Rezervovať demo | Revolis.AI",
  description:
    "Nezáväzné demo na mieru — AI hodnotenie kontaktov, automatické follow-upy a predikcia lievika na vašich dátach.",
};

export default function DemoRezervaciaPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}
    >
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <header className="text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.28em]"
            style={{ color: SLATE_HORIZON.brandDeep }}
          >
            Demo na mieru
          </p>
          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: SLATE_HORIZON.ink }}
          >
            Rezervujte si demo na vlastných dátach
          </h1>
          <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: SLATE_HORIZON.muted }}>
            30 minút, žiadny záväzok. Ozveme sa s návrhom termínu a konkrétnym scenárom ukážky.
          </p>
        </header>
        <div className="mt-8">
          <DemoRequestForm />
        </div>
      </div>
      <LegalFooter />
    </main>
  );
}
