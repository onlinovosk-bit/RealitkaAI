"use client";
import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    stars: 5,
    quote: 'Sofia zachránila môj biznis. Odpovedá kým spím a ráno mám naplánované obhliadky.',
    name: 'Tomáš Novák',
    company: 'Reality Novák, Bratislava',
    metric: '+41% konverzia',
    metricColor: '#22D3EE',
  },
  {
    stars: 5,
    quote: 'Prvý mesiac som uzatvoril 3 dealy navyše. AI skórovanie mi ušetrí hodiny denne.',
    name: 'Marta Kováčová',
    company: 'MK Reality, Košice',
    metric: '+3 dealy/mesiac',
    metricColor: '#34D399',
  },
  {
    stars: 5,
    quote: 'Myslel som, že AI v realitách je buzzword. Mýlil som sa. Revolis je iný level.',
    name: 'Peter Horváth',
    company: 'Horváth & Partner, Nitra',
    metric: '2x rýchlejší',
    metricColor: '#818CF8',
  },
];

export default function Testimonials() {
  return (
    <section className="py-28" style={{ background: '#050914' }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.3em] mb-4"
             style={{ color: '#22D3EE' }}>
            Reálne výsledky
          </p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold"
            style={{ fontFamily: 'var(--font-syne)', color: '#F0F9FF' }}
          >
            Čo hovoria naši makléri
          </h2>
        </motion.div>
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-40px' }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="flex flex-col rounded-2xl p-6"
              style={{
                background: '#0A1628',
                border: '1px solid #112240',
              }}
            >
              {/* Stars */}
              <div className="text-sm mb-4" style={{ color: '#FBBF24' }}>
                {'★'.repeat(t.stars)}
              </div>
              {/* Quote */}
              <p
                className="text-sm leading-relaxed flex-1 mb-6 italic"
                style={{ color: '#94A3B8' }}
              >
                „{t.quote}"
              </p>
              {/* Author + metric */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#F0F9FF' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {t.company}
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                  style={{
                    color: t.metricColor,
                    background: `${t.metricColor}18`,
                    border: `1px solid ${t.metricColor}35`,
                  }}
                >
                  {t.metric}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
