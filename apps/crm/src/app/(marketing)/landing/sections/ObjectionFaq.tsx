'use client';
import { useState } from 'react';

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

export default function ObjectionFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-slate-950 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h3 className="mt-2 text-center text-3xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
          Často kladené otázky
        </h3>

        <div className="mt-8 space-y-3">
          {faq.map((item, i) => (
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
