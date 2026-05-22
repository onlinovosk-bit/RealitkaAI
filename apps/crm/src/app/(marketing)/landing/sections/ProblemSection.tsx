'use client';

import { motion } from 'framer-motion';
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

export default function ProblemSection() {
  return (
    <section className="py-24 sm:py-28" style={{ background: SLATE_HORIZON.bg }}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="mb-8 text-4xl font-extrabold leading-tight sm:text-5xl"
          style={{ color: SLATE_HORIZON.ink }}
        >
          Strácaš klientov,
          <br />
          <span style={{ color: SLATE_HORIZON.muted }}>pretože nemáš dostatok času a občas nemáš prehľad.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true, margin: '-100px' }}
          className="mx-auto mb-16 max-w-2xl text-lg"
          style={{ color: SLATE_HORIZON.deep }}
        >
          Nové dopyty pribúdajú. Času je menej. Najdôležitejší klient ostane zakopaný v správach a portáloch — a odíde
          ku konkurencii.
        </motion.p>

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
          }}
        >
          {[
            { stat: '4+ hodiny', desc: 'priemerná odpoveď na nový dopyt' },
            { stat: '60 %', desc: 'záujemcov sa nikdy neozve späť' },
            { stat: '€2 400', desc: 'stratených príjmov mesačne' },
          ].map((item) => (
            <motion.div
              key={item.stat}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="rounded-2xl border p-6 text-center"
              style={{
                background: SLATE_HORIZON_BADGES.hot.bg,
                borderColor: SLATE_HORIZON_BADGES.hot.border,
                boxShadow: WORKDESK_CARD.boxShadow,
              }}
            >
              <div className="mb-2 text-4xl font-extrabold" style={{ color: SLATE_HORIZON.danger }}>
                {item.stat}
              </div>
              <p className="text-sm" style={{ color: SLATE_HORIZON.deep }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
