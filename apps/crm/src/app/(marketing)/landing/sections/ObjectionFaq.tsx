'use client';
import { useState } from 'react';
import type { PricingV2Catalog } from '@/lib/pricing-v2';
import { formatEurFromCents, usersRangeLabel } from '@/components/marketing/pricing-v2-copy';

const faq = [
  {
    q: 'Čo ak nemáme čas na zavedenie nového systému?',
    a: 'Začíname s minimálnou konfiguráciou. Prvé výsledky vidíš po zapnutí AI odpovedí a denného plánu úloh. Tím nemusí meniť celý proces naraz.',
  },
  {
    q: 'Čo ak AI odpovie zle klientovi?',
    a: 'Každá kancelária má vlastné nastavenie tónu, ochranné pravidlá a prepnutie na makléra. Kritické odpovede vieš schvaľovať alebo upraviť skôr, než odídu ku klientovi.',
  },
  {
    q: 'Ako rýchlo to vieme nasadiť?',
    a: 'Štandardne do 1 dňa: registrácia, úvodné nastavenie, import príležitostí, zapnutie automatizácie a prvé výkonové reporty.',
  },
  {
    q: 'Oplatí sa to finančne?',
    a: '<strong><em>Revolis.AI nestojí ani zlomok jedného strateného obchodu.</em></strong> Priemerná maklérska provízia na Slovensku je 2 000 – 4 000 €. Mesačné predplatné Starter stojí 49 €. Stačí uzatvoriť o jeden obchod viac za rok — a systém sa zaplatí mnohonásobne.',
  },
  {
    q: 'Môžem to vyskúšať bez záväzku?',
    a: 'Áno. Každý plán má 30-dňovú garanciu vrátenia peňazí. Ak nebudeš spokojný, vrátime ti celú sumu bez otázok.',
  },
  {
    q: 'Čo ak mám záujemcov z viacerých portálov naraz?',
    a: 'Revolis.AI automaticky stiahne príležitosti z Nehnuteľnosti.sk, Reality.sk, TopReality.sk a ďalších. Všetko na jednom mieste, nič sa nestratí.',
  },
  {
    q: 'Funguje to aj pre malú kanceláriu alebo samostatného makléra?',
    a: 'Áno — Starter plán je navrhnutý práve pre samostatných maklérov a kancelárie do 3 ľudí. Veľkosť tímu nehrá rolu, výsledky sú viditeľné od prvého týždňa.',
  },
];

/**
 * Cenník v2 (W3-fix): variant FAQ bez starých cien a bez garancie (garancia nie je pre v2 rozhodnutá, viď
 * docs/pricing/w2d-copy-and-legal-review.md). Všetky sumy idú z katalógu (`buildPricingV2Catalog`).
 */
function buildFaqV2(catalog: PricingV2Catalog): typeof faq {
  const cheapest = [...catalog.bands].sort((a, b) => a.netCents - b.netCents)[0];
  const solo = catalog.bands.find((b) => b.minUsers === 1);
  const team = catalog.bands.find((b) => b.minUsers > 1);
  const price = `${formatEurFromCents(cheapest.netCents)} mesačne bez DPH (${formatEurFromCents(cheapest.grossCents)} s DPH ${String(catalog.vatPercent).replace('.', ',')}\u00a0%)`;
  return faq
    .filter((item) => item.q !== 'Môžem to vyskúšať bez záväzku?')
    .map((item) => {
      if (item.q === 'Oplatí sa to finančne?') {
        return {
          q: item.q,
          a: `<strong><em>Jeden obchod navyše za rok pokryje cenu systému mnohonásobne.</em></strong> Priemerná maklérska provízia na Slovensku je 2 000 – 4 000 €. Plány pre celú kanceláriu začínajú na ${price}.`,
        };
      }
      if (item.q === 'Funguje to aj pre malú kanceláriu alebo samostatného makléra?' && solo && team) {
        return {
          q: item.q,
          a: `Áno — plán ${solo.label} je pre ${usersRangeLabel(solo)}, plán ${team.label} pre ${usersRangeLabel(team)}. Platíte jeden paušál za celú kanceláriu, nie za každého makléra zvlášť. Výsledky sú viditeľné od prvého týždňa.`,
        };
      }
      return item;
    });
}

export default function ObjectionFaq({ pricingV2 = null }: { pricingV2?: PricingV2Catalog | null } = {}) {
  const [open, setOpen] = useState(0);
  const items = pricingV2 ? buildFaqV2(pricingV2) : faq;
  return (
    <section className="bg-slate-950 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h3 className="mt-2 text-center text-3xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
          Často kladené otázky
        </h3>

        <div className="mt-8 space-y-3">
          {items.map((item, i) => (
            <div key={item.q} className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between text-left">
                <span className="text-sm font-semibold text-slate-100">{item.q}</span>
                <span className="text-cyan-300">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <p
                  className="mt-3 text-sm text-slate-400"
                  dangerouslySetInnerHTML={{ __html: item.a }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
