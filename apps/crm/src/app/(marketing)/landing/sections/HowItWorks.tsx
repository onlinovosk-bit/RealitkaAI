"use client";
import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    icon: '📥',
    title: 'Lead príde z portálu',
    desc: 'Nehnuteľnosti.sk, Reality.sk, TopReality.sk – všetko automaticky na jednom mieste. Nič sa nestratí.',
  },
  {
    number: '02',
    icon: '🤖',
    title: 'Sofia koná okamžite',
    desc: 'Odpovedá do 2 minút, skóruje lead, navrhne obhliadku. Bez tvojho zásahu.',
  },
  {
    number: '03',
    icon: '💰',
    title: 'Ty uzatváraš deal',
    desc: 'Vidíš len prioritné leady. AI robí zvyšok. Viac dealov, menej stresu.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-28" style={{ background: '#0D0D14' }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <p className="text-sm uppercase tracking-[0.3em] mb-4"
             style={{ color: '#22D3EE' }}>
            Ako to funguje
          </p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold mb-4"
            style={{ fontFamily: 'var(--font-syne)', color: '#F0F9FF' }}
          >
            Od leadu k dealu.
            <br />
            <span style={{ color: '#22D3EE' }}>3 kroky.</span>
          </h2>
          <p style={{ color: '#64748B' }}>Bez manuálnej práce. Bez chaosu.</p>
        </motion.div>
        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connecting line – desktop */}
          <div
            className="absolute top-10 left-[20%] right-[20%] h-px hidden md:block"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), transparent)',
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
              {/* Background number */}
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-8xl font-extrabold select-none pointer-events-none"
                style={{
                  fontFamily: 'var(--font-syne)',
                  color: 'rgba(34,211,238,0.04)',
                  lineHeight: 1,
                }}
              >
                {step.number}
              </div>
              {/* Icon circle */}
              <div
                className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
                style={{
                  background: 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.20)',
                  boxShadow: '0 0 30px rgba(34,211,238,0.08)',
                }}
              >
                {step.icon}
              </div>
              <h3
                className="text-xl font-bold mb-3"
                style={{ fontFamily: 'var(--font-syne)', color: '#F0F9FF' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
