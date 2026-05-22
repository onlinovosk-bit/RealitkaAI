"use client";

import { motion } from 'framer-motion';
import { LANDING_AI_ASSISTANT_NAME } from '@/app/(marketing)/landing/landing-ai-label';
import { RadiantSpriteIcon, type RadiantIconKey } from '@/components/shared/radiant-sprite-icon';
import { SLATE_HORIZON, WORKDESK_CARD } from '@/lib/slate-horizon-theme';

const steps = [
  {
    number: '01',
    icon: 'import' as RadiantIconKey,
    title: 'Príležitosť príde z portálu',
    desc: 'Nehnuteľnosti.sk, Reality.sk, TopReality.sk, Bazos.sk — všetko automaticky na jednom mieste. Nič sa nestratí.',
  },
  {
    number: '02',
    icon: 'revolis-ai' as RadiantIconKey,
    title: `${LANDING_AI_ASSISTANT_NAME} koná okamžite`,
    desc: 'Odpovedá do 2 minút, ohodnotí záujemcu, navrhne obhliadku. Bez tvojho zásahu.',
  },
  {
    number: '03',
    icon: 'billing' as RadiantIconKey,
    title: 'Ty uzatváraš obchod',
    desc: 'Vidíš len prioritných záujemcov. AI robí zvyšok. Viac uzavretých obchodov, menej stresu.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 sm:py-28" style={{ background: '#FFFFFF' }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.3em]" style={{ color: SLATE_HORIZON.brandDeep }}>
            Ako to funguje
          </p>
          <h2 className="mb-4 text-4xl font-extrabold sm:text-5xl" style={{ color: SLATE_HORIZON.ink }}>
            Od záujemcu k obchodu.
            <br />
            <span style={{ color: SLATE_HORIZON.brand }}>3 kroky.</span>
          </h2>
          <p style={{ color: SLATE_HORIZON.muted }}>Bez manuálnej práce. Bez chaosu.</p>
        </motion.div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          <div
            className="absolute left-[20%] right-[20%] top-10 hidden h-px md:block"
            style={{
              background: `linear-gradient(90deg, transparent, ${SLATE_HORIZON.softBorder}, transparent)`,
            }}
          />
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-60px' }}
              className="relative text-center"
            >
              <div
                className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none text-8xl font-extrabold"
                style={{ color: 'rgba(37,99,235,0.06)', lineHeight: 1 }}
              >
                {step.number}
              </div>
              <div
                className="relative z-10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border"
                style={{
                  background: SLATE_HORIZON.soft,
                  borderColor: SLATE_HORIZON.softBorder,
                  boxShadow: WORKDESK_CARD.boxShadow,
                }}
              >
                <RadiantSpriteIcon icon={step.icon} sizeClassName="h-12 w-12" />
              </div>
              <h3 className="mb-3 text-xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: SLATE_HORIZON.deep }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
