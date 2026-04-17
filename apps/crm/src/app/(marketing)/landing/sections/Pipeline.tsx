'use client';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { RadiantSpriteIcon, type RadiantIconKey } from '@/components/shared/radiant-sprite-icon';

const steps = [
  {
    icon: 'properties' as RadiantIconKey,
    title: 'Záujemcovia prichádzajú',
    desc: 'Z webu, portálov, kampaní a odporúčaní. Nehnuteľnosti.sk, Reality.sk, TopReality.sk, Bazos.sk. Nič sa nestratí.',
  },
  {
    icon: 'revolis-ai' as RadiantIconKey,
    title: 'AI pochopí zámer a správanie',
    desc: 'Revolis analyzuje históriu, aktivitu a kontext každého klienta. V reálnom čase.',
  },
  {
    icon: 'dashboard' as RadiantIconKey,
    title: 'Zoradí klientov podľa pripravenosti',
    desc: 'Index pripravenosti kúpy (BRI) ti ukáže presne, kto je pripravený kúpiť práve dnes.',
  },
  {
    icon: 'playbook' as RadiantIconKey,
    title: 'Navrhne ďalší krok a správu',
    desc: 'AI ti pripraví konkrétny telefonát, správu alebo obhliadku. Ty len potvrdíš.',
  },
];

export default function Pipeline() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % steps.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="pipeline" className="bg-gradient-to-b from-slate-950 to-slate-900 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <p className="text-sm text-cyan-400 uppercase tracking-[0.3em] mb-4">Riešenie</p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold text-white mb-4"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Všetci klienti. Na jednom mieste.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Revolis.AI ti v reálnom čase povie, komu sa oplatí venovať práve dnes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-60px' }}
              onClick={() => setActive(i)}
              className={`relative flex flex-col gap-3 rounded-2xl border p-5 text-sm cursor-pointer transition-all duration-500
                ${active === i
                  ? 'border-cyan-400/60 bg-cyan-400/[0.08] shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                  : 'border-slate-700/60 bg-slate-900/70 opacity-60 hover:opacity-80'
                }`}
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-600 z-10 text-lg">
                  |
                </div>
              )}

              <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/70 flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold
                    ${active === i ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-cyan-200'}`}
                >
                  {i + 1}
                </span>
                Krok {i + 1}
              </div>

              <div className="text-3xl">
                <RadiantSpriteIcon icon={step.icon} sizeClassName="h-10 w-10" />
              </div>
              <h3
                className="text-base font-bold text-slate-50"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {step.title}
              </h3>

              <motion.p
                key={`desc-${active}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: active === i ? 1 : 0.5 }}
                className="text-xs text-slate-400 leading-relaxed"
              >
                {step.desc}
              </motion.p>

              {active === i && (
                <motion.div
                  layoutId="pipeline-active"
                  className="absolute inset-0 rounded-2xl border border-cyan-400/30 bg-cyan-500/5"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
