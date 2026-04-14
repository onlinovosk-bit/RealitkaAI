'use client';
import { motion } from 'framer-motion';
import { RadiantSpriteIcon, type RadiantIconKey } from '@/components/shared/radiant-sprite-icon';

export default function ProblemSection() {
  return (
    <section className="bg-black py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-4xl sm:text-5xl font-extrabold text-slate-50 leading-tight mb-8"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          Strácaš klientov,
          <br />
          <span className="text-slate-400">pretože nemáš prehľad.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-lg text-slate-400 max-w-2xl mx-auto mb-16"
        >
          Leady pribúdajú. Času je menej. Najdôležitejší klient ostane zakopaný v CRM
          — a odíde ku konkurencii.
        </motion.p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
          }}
        >
          {[
            { icon: 'tasks' as RadiantIconKey, stat: '4+ hodiny', desc: 'priemerná odpoveď na lead' },
            { icon: 'pipeline' as RadiantIconKey, stat: '60 %', desc: 'leadov sa nikdy neozve späť' },
            { icon: 'billing' as RadiantIconKey, stat: '€2 400', desc: 'stratených príjmov mesačne' },
          ].map((item) => (
            <motion.div
              key={item.stat}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center"
            >
              <div className="mb-3 flex justify-center">
                <RadiantSpriteIcon icon={item.icon} sizeClassName="h-10 w-10" />
              </div>
              <div
                className="text-4xl font-extrabold text-red-400 mb-2"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {item.stat}
              </div>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
