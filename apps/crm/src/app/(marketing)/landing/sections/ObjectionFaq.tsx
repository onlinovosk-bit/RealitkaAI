'use client';
import { useState } from 'react';

const faq = [
  {
    q: 'Čo ak nemáme čas na zavedenie nového systému?',
    a: 'Začíname s minimálnou konfiguráciou. Prvé výsledky vidíš po zapnutí AI odpovedí a denného plánu úloh. Tím nemusí meniť celý proces naraz.',
  },
  {
    q: 'Čo ak AI odpovie zle klientovi?',
    a: 'Každá kancelária má vlastné nastavenie tónu, guardrails a fallback na makléra. Kritické odpovede vieš schvaľovať alebo upraviť.',
  },
  {
    q: 'Ako rýchlo to vieme nasadiť?',
    a: 'Štandardne do 1 dňa: registrácia, úvodné nastavenie, import príležitostí, zapnutie automatizácie a prvé výkonové reporty.',
  },
];

export default function ObjectionFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-slate-950 py-16">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-cyan-300">FAQ: ceny a riziká</p>
        <h3 className="mt-2 text-center text-3xl font-extrabold text-slate-100" style={{ fontFamily: 'var(--font-syne)' }}>
          Najčastejšie obchodné námietky
        </h3>

        <div className="mt-8 space-y-3">
          {faq.map((item, i) => (
            <div key={item.q} className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between text-left">
                <span className="text-sm font-semibold text-slate-100">{item.q}</span>
                <span className="text-cyan-300">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="mt-3 text-sm text-slate-400">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
