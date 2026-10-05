/**
 * VOP / Terms — cenník v2 (W2-D). NÁVRH NA REVÍZIU foundera/právnika, NIE schválený text.
 *
 * Používa sa výhradne pri zapnutom `PRICING_V2_ENABLED` (page.tsx). Ceny idú len z katalógu
 * `buildPricingV2Catalog`; čo nie je rozhodnuté, je označené „DOPLNIŤ — rozhodnutie foundera“
 * a zámerne ostáva viditeľné, aby sa text nedal nechtiac zverejniť ako hotový.
 * Zoznam zmien a otvorené právne otázky: docs/pricing/w2d-copy-and-legal-review.md
 */
import type { PricingV2Catalog } from "@/lib/pricing-v2";
import {
  creditUnitLine,
  grossPriceLine,
  monthlyCreditsLine,
  netPriceLine,
  packPriceLine,
  usersRangeLabel,
} from "@/components/marketing/pricing-v2-copy";

export type TermsProgram = { name: string; note: string; features: string[] };

export const TERMS_V2_PLACEHOLDER = "DOPLNIŤ — rozhodnutie foundera";

export const TERMS_V2_SUBTITLE = `Všeobecné obchodné podmienky pre používanie Revolis.AI. Posledná aktualizácia: ${TERMS_V2_PLACEHOLDER} (dátum účinnosti).`;

export const TERMS_V2_DRAFT_BANNER =
  "NÁVRH VOP pre nový cenník — čaká na odobrenie foundera a právnika. Nie je schválený ani účinný text.";

export const TERMS_V2_PROGRAMS_TITLE = "Kapitola: Prehľad plánov a kreditov";

export const TERMS_V2_PROGRAMS_INTRO =
  "Nižšie je orientačný prehľad plánov kancelárie a kreditov. Záväzný rozsah služieb, limity a SLA vždy určuje aktuálny objednávkový formulár, VOP a prípadné enterprise annexy.";

export function buildTermsProgramsV2(catalog: PricingV2Catalog): TermsProgram[] {
  const bandPrograms: TermsProgram[] = catalog.bands.map((band) => ({
    name: `${band.label} — ${usersRangeLabel(band)} (${netPriceLine(band)}; ${grossPriceLine(band, catalog.vatPercent)})`,
    note: band.isFromPrice
      ? "Paušál za celú kanceláriu, nie za jednotlivého používateľa. Cena sa dohodne podľa objemu."
      : "Paušál za celú kanceláriu, nie za jednotlivého používateľa.",
    features: [
      monthlyCreditsLine(band),
      "Plán sa určuje podľa počtu povolených používateľov v kancelárii",
    ],
  }));

  return [
    ...bandPrograms,
    {
      name: "Kredity navyše (voliteľné)",
      note: "Kredity patria kancelárii. Mesačné balíky sa pripočítavajú k plánu, jednorazové kredity sa dokupujú podľa potreby.",
      features: [
        ...catalog.packs.map((pack) => packPriceLine(pack, catalog.vatPercent)),
        `Jednorazové dokúpenie: ${creditUnitLine(catalog)}`,
      ],
    },
    {
      name: "Add-on moduly (tenant pricing)",
      note: "Modulárny stack aktivovaný nad plánom kancelárie. Moduly označené „Čoskoro“ nie sú v self-serve predaji.",
      features: [
        `Ceny add-on modulov (CRM Sync, White Label): ${TERMS_V2_PLACEHOLDER}`,
        "Leads Engine — roadmap / čoskoro (nie je v self-serve checkout)",
        "Market Intelligence — roadmap / čoskoro",
        "Protocol AI modul — roadmap / čoskoro",
        "Active Force Calls — roadmap / čoskoro",
      ],
    },
  ];
}

/** Doplnková kapitola o platbách; všetko, čo nie je rozhodnuté, je označené placeholderom. */
export function buildTermsPaymentsClausesV2(catalog: PricingV2Catalog): { title: string; text: string }[] {
  const vat = `${String(catalog.vatPercent).replace(".", ",")} %`;
  return [
    {
      title: "DPH",
      text: `Ceny plánov a kreditov sú uvedené bez DPH; konečná cena s DPH ${vat} sa uvádza vždy vedľa nej. Potvrdenie základu a sadzby DPH: ${TERMS_V2_PLACEHOLDER}.`,
    },
    {
      title: "Mesačné opakované platby a zrušenie",
      text: `Plán a mesačný balík kreditov sa účtujú mesačne opakovane. Zrušenie, výpovedná doba a následky nezaplatenia: ${TERMS_V2_PLACEHOLDER}.`,
    },
    {
      title: "Kredity a ich platnosť",
      text: `Mesačné kredity plánu a balíka a jednorazovo dokúpené kredity patria kancelárii. Platnosť (expirácia) nevyčerpaných kreditov a postup po ich vyčerpaní: ${TERMS_V2_PLACEHOLDER}.`,
    },
    {
      title: "Existujúci zákazníci",
      text: `Zákazník s už dohodnutými podmienkami ostáva pri nich a na nový cenník sa automaticky nepresúva. Znenie a podmienky prípadného prechodu: ${TERMS_V2_PLACEHOLDER}.`,
    },
    {
      title: "Jednorazový onboarding a vrátenie platby",
      text: `Poplatok za onboarding (výška alebo bez poplatku) a podmienky vrátenia platby: ${TERMS_V2_PLACEHOLDER}.`,
    },
  ];
}
