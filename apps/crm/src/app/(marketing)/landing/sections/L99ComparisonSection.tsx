'use client';
import { motion } from 'framer-motion';

const OLD = [
  'Čakajú, kým klient zavolá — vtedy volá všetkým.',
  'Súperia o nízku províziu v aukcii na portáloch.',
  '80 % CRM databázy je nevyužitý mŕtvy kapitál.',
];

const NEW = [
  { label: 'Exkluzivita:', text: 'Viete o zámere predať týždne pred prvým inzerátom.' },
  { label: 'Ochrana marže:', text: 'Budujete vzťah v čase, keď neexistuje žiadna konkurencia.' },
  { label: 'AI Audit tímu:', text: 'Každý kontakt v CRM je aktívne monitorovaný AI 24/7.' },
];

export default function L99ComparisonSection() {
  return (
    <section className="py-24 px-4 sm:px-6" style={{ background: '#080810' }}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: '-60px' }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm uppercase tracking-[0.3em] text-blue-400">Strategická analýza</p>
          <h2
            className="mb-4 text-3xl font-extrabold sm:text-5xl text-white"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Prečo tradičné CRM nestačí?
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Rozdiel medzi reaktívnym čakaním na dopyt a proaktívnym ovládaním trhu.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Reaktívny model */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-8"
          >
            <h3 className="mb-6 text-lg font-semibold text-slate-300">
              Reaktívny model — Tradičná RK
            </h3>
            <ul className="space-y-4">
              {OLD.map((text) => (
                <li key={text} className="flex items-start gap-3 text-slate-400">
                  <span className="mt-0.5 text-red-500 flex-shrink-0">✕</span>
                  {text}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* L99 model */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-500/[0.05] p-8"
          >
            <div className="absolute right-0 top-0 rounded-bl-xl bg-blue-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
              L99 Advantage
            </div>
            <h3 className="mb-6 text-lg font-semibold text-blue-400">
              Proaktívny model — Revolis L99
            </h3>
            <ul className="space-y-4">
              {NEW.map((item) => (
                <li key={item.label} className="flex items-start gap-3 text-white">
                  <span className="mt-0.5 text-blue-400 flex-shrink-0">✓</span>
                  <span>
                    <strong className="text-blue-200">{item.label}</strong> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* ROI čísla */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 gap-10 border-t border-white/10 pt-16 text-center sm:grid-cols-3"
        >
          {[
            { value: '+35 %', label: 'Nárast efektivity naberania mandátov' },
            { value: '0 %', label: 'Konkurencia pri oslovení predikovaných kontaktov' },
            { value: '24/7', label: 'AI monitoring vašich najcennejších aktív' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="mb-2 text-4xl font-extrabold text-blue-400" style={{ fontFamily: 'var(--font-syne)' }}>
                {stat.value}
              </div>
              <p className="text-sm uppercase tracking-tight text-slate-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
