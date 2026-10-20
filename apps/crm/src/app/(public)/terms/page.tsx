import LegalPageShell from "@/components/legal/legal-page-shell";
import Link from "next/link";
import { isPricingV2Enabled, PRICING_V2_VAT_PERCENT_DEFAULT } from "@/lib/pricing-v2";
import { getPublicPricingCatalog } from "@/components/marketing/public-pricing";
import {
  buildTermsPaymentsClausesV2,
  buildTermsProgramsOnRequest,
  buildTermsProgramsV2,
  TERMS_V2_DRAFT_BANNER,
  TERMS_V2_PROGRAMS_INTRO,
  TERMS_V2_PROGRAMS_TITLE,
  TERMS_V2_SUBTITLE,
} from "./terms-v2";

const legalSuiteChapters = [
  {
    title: "Dokument 1: Master Service Agreement (MSA)",
    summary: "Rozsah služieb, licencia, obchodné podmienky, IP a ukončenie.",
    href: "/legal/zmluva-o-poskytovani-softverovych-sluzieb",
    cta: "Otvoriť SaaS zmluvu",
  },
  {
    title: "Dokument 2: Data Processing Agreement (DPA)",
    summary: "GDPR režim spracovania, subprocesori, incident reporting a bezpečnosť.",
    href: "/trust-center",
    cta: "Požiadať o DPA cez Trust Center",
  },
  {
    title: "Dokument 3: Privacy Policy",
    summary: "Právne základy spracovania, retention a práva dotknutých osôb.",
    href: "/privacy-policy",
    cta: "Otvoriť Privacy Policy",
  },
  {
    title: "Dokument 4: Service Level Agreement (SLA)",
    summary: "Dostupnosť, reakčné časy, servisné kredity a výluky zo SLA.",
    href: "/support",
    cta: "Otvoriť Support SLA",
  },
  {
    title: "Dokument 5: Indemnification Clause",
    summary: "Vzájomné odškodnenie strán a limity zodpovednosti.",
    href: "/trust-center",
    cta: "Požiadať o indemnification annex",
  },
  {
    title: "Dokument 6: VOP / Terms",
    summary: "Self-serve podmienky, fair use limity, black-box AI a export dát.",
    href: "/terms",
    cta: "Ste na tejto stránke",
  },
  {
    title: "Dokument 7: AI Compliance & Enterprise FAQ",
    summary: "AI governance, security posture a odpovede pre enterprise due diligence.",
    href: "/security",
    cta: "Otvoriť Security & Compliance",
  },
  {
    title: "Dokument 8: MSA Checklist — Enterprise Readiness",
    summary: "Praktický readiness plán pred enterprise onboardingom klienta.",
    href: "/legal/first-client-readiness",
    cta: "Otvoriť Readiness 14D",
  },
];

const programOverview = [
  {
    name: "Solo Seat",
    note: "Základný seat pre samostatného makléra alebo mikro tím.",
    features: [
      "1 maklérsky seat",
      "Sofia AI a základný radar",
      "Self-serve onboarding",
    ],
  },
  {
    name: "Team Seat (3-9 seatov)",
    note: "Zvýhodnená cena pre tímový režim.",
    features: [
      "Owner dashboard v cene tímu",
      "Team radar a tímové prehľady",
      "Seat expansion podľa počtu maklérov",
    ],
  },
  {
    name: "Office Seat (10+ seatov)",
    note: "Kancelársky režim s výhodnejšou cenou a enterprise pripravenosťou.",
    features: [
      "Priority support",
      "Protocol AI readiness",
      "Rozšírené governance a compliance režimy",
    ],
  },
  {
    name: "Add-on moduly (tenant pricing)",
    note: "Modulárny stack aktivovaný nad seat licenciami. Moduly označené „Čoskoro“ nie sú v self-serve predaji.",
    features: [
      "CRM Sync — cenu vám pošleme na vyžiadanie",
      "White Label — cenu vám pošleme na vyžiadanie",
      "Leads Engine — roadmap / čoskoro (nie je v self-serve checkout)",
      "Market Intelligence — roadmap / čoskoro",
      "Protocol AI modul — roadmap / čoskoro",
      "Active Force Calls — roadmap / čoskoro",
    ],
  },
];

export const metadata = {
  title: "VOP / Terms | Revolis.AI",
  description: "Všeobecné obchodné podmienky Revolis.AI pre self-serve zákazníkov.",
};

export default function TermsPage() {
  // v3 variant (NÁVRH, čaká na odobrenie) len pri zapnutom PRICING_V2_ENABLED; vypnutý = pôvodný text (bez súm).
  // PR1 §4: sumy sa ukážu LEN pri zapnutom PRICING_PUBLIC_ENABLED, inak „Cenu vám pošleme na vyžiadanie“.
  const v2On = isPricingV2Enabled();
  const publicCatalog = getPublicPricingCatalog();
  const programs = publicCatalog
    ? buildTermsProgramsV2(publicCatalog)
    : v2On
      ? buildTermsProgramsOnRequest()
      : programOverview;
  return (
    <LegalPageShell
      title="VOP / Terms"
      subtitle={
        v2On
          ? TERMS_V2_SUBTITLE
          : "Všeobecné obchodné podmienky pre používanie Revolis.AI. Posledná aktualizácia: 2. júna 2026."
      }
    >
      <div className="space-y-6 text-sm text-slate-200">
        {v2On && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 font-semibold text-amber-200">
            {TERMS_V2_DRAFT_BANNER}
          </section>
        )}
        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <h2 className="text-lg font-semibold text-white">Mapovanie kapitol Legal Suite</h2>
          <p className="mt-2 text-slate-300">
            Jednotlivé kapitoly z dokumentu <strong>Revolis AI Legal Suite</strong> sú nasadené na príslušné verejné
            podstránky alebo cez Trust Center request flow.
          </p>
          <div className="mt-4 space-y-3">
            {legalSuiteChapters.map((chapter) => (
              <article key={chapter.title} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <h3 className="text-sm font-semibold text-cyan-200">{chapter.title}</h3>
                <p className="mt-1 text-xs text-slate-300">{chapter.summary}</p>
                <Link
                  href={chapter.href}
                  className="mt-2 inline-block rounded-full border border-cyan-400/40 px-3 py-1 text-[11px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300"
                >
                  {chapter.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="programy" className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
          <h2 className="text-lg font-semibold text-white">
            {v2On ? TERMS_V2_PROGRAMS_TITLE : "Kapitola: Podrobný prehľad 4 programov"}
          </h2>
          <p className="mt-2 text-slate-300">
            {v2On
              ? TERMS_V2_PROGRAMS_INTRO
              : "Nižšie je orientačný prehľad seatov a modulov. Záväzný rozsah služieb, limity a SLA vždy určuje aktuálny objednávkový formulár, VOP a prípadné enterprise annexy."}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {programs.map((program) => (
              <article key={program.name} className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <h3 className="text-sm font-semibold text-violet-200">{program.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{program.note}</p>
                <ul className="mt-3 space-y-1 text-xs text-slate-300">
                  {program.features.map((feature) => (
                    <li key={feature}>- {feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">1. Licencia a povolené používanie</h2>
          <p className="mt-2 text-slate-300">
            Zákazník získava neexkluzívnu licenciu na interné obchodné účely v rozsahu predplateného plánu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Fair use a technické limity</h2>
          <p className="mt-2 text-slate-300">
            Používanie API a exportu podlieha limitom podľa plánu. Zakázané je zneužitie služby, spamovanie a
            harvesting dát.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. AI a duševné vlastníctvo</h2>
          <p className="mt-2 text-slate-300">
            AI logika je poskytovaná ako black-box služba. Reverse engineering, odvodenie logiky systému a benchmarking
            bez súhlasu sú zmluvne zakázané.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Ukončenie a export dát</h2>
          <p className="mt-2 text-slate-300">
            Po ukončení služby má zákazník obmedzenú lehotu na export dát v štandardných formátoch. Následne sa dáta
            bezpečne vymažú podľa retention pravidiel.
          </p>
        </section>

        {v2On && (
          <section>
            <h2 className="text-lg font-semibold text-white">5. Platby, kredity a zrušenie (návrh)</h2>
            <ul className="mt-2 space-y-2 text-slate-300">
              {buildTermsPaymentsClausesV2(PRICING_V2_VAT_PERCENT_DEFAULT).map((clause) => (
                <li key={clause.title}>
                  <strong>{clause.title}:</strong> {clause.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
          Tento prehľad je skrátená verzia. Zmluvne záväzné je úplné znenie VOP v kontraktačnej dokumentácii.
        </section>
      </div>
    </LegalPageShell>
  );
}
