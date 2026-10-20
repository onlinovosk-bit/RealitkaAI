'use client';
import { useState } from 'react';
import type { PricingV2Catalog } from '@/lib/pricing-v2';
import { formatEurFromCents } from '@/components/marketing/pricing-v2-copy';
import { GUARANTEE_TEXT, PRICE_ON_REQUEST_TEXT } from '@/components/marketing/guarantee-copy';

const GUARANTEE_QUESTION = 'Môžem to vyskúšať bez záväzku?';
const COST_QUESTION = 'Oplatí sa to finančne?';
const SMALL_OFFICE_QUESTION = 'Funguje to aj pre malú kanceláriu alebo samostatného makléra?';

/**
 * Základné FAQ bez akejkoľvek sumy (PR1 §4: kým je PRICING_PUBLIC_ENABLED vypnuté, verejný web nesmie ukázať cenu).
 * Ani v texte o provízii nie je znak „€“, aby test „žiadna suma“ platil aj pre celé FAQ.
 */
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
    q: COST_QUESTION,
    a: `<strong><em>Revolis.AI nestojí ani zlomok jedného strateného obchodu.</em></strong> Provízia za jeden obchod sa na Slovensku počíta v tisíckach eur. Stačí uzatvoriť o jeden obchod viac za rok — a systém sa zaplatí mnohonásobne. ${PRICE_ON_REQUEST_TEXT}.`,
  },
  {
    q: GUARANTEE_QUESTION,
    a: `Áno. ${GUARANTEE_TEXT}.`,
  },
  {
    q: 'Čo ak mám záujemcov z viacerých portálov naraz?',
    a: 'Revolis.AI automaticky stiahne príležitosti z Nehnuteľnosti.sk, Reality.sk, TopReality.sk a ďalších. Všetko na jednom mieste, nič sa nestratí.',
  },
  {
    q: SMALL_OFFICE_QUESTION,
    a: 'Áno — Revolis.AI je navrhnutý pre samostatných maklérov aj pre celé kancelárie. Veľkosť tímu nehrá rolu, cena sa riadi počtom maklérov a výsledky sú viditeľné od prvého týždňa.',
  },
];

/**
 * Cenník v3 (PR1): variant FAQ s cenami z katalógu (`buildPricingV2Catalog`). Používa sa len pri zapnutom
 * PRICING_PUBLIC_ENABLED; inak server pošle `null` a platí základné FAQ vyššie.
 */
function buildFaqV2(catalog: PricingV2Catalog): typeof faq {
  const cheapest = [...catalog.bands].sort((a, b) => a.netCents - b.netCents)[0];
  const price = `${formatEurFromCents(cheapest.netCents)} mesačne bez DPH pri ročnej platbe (${formatEurFromCents(cheapest.grossCents)} s DPH ${String(catalog.vatPercent).replace('.', ',')}\u00a0%)`;
  return faq.map((item) => {
    if (item.q === COST_QUESTION) {
      return {
        q: item.q,
        a: `<strong><em>Jeden obchod navyše za rok pokryje cenu systému mnohonásobne.</em></strong> Priemerná maklérska provízia na Slovensku je 2 000 – 4 000 €. Cena sa riadi počtom maklérov a začína na ${price}.`,
      };
    }
    if (item.q === SMALL_OFFICE_QUESTION) {
      return {
        q: item.q,
        a: 'Áno — pásmo sa nastaví samo podľa počtu maklérov (1 / 2–5 / 6–10 / 11 a viac). Výsledky sú viditeľné od prvého týždňa.',
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
