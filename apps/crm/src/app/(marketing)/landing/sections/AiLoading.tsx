'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import { AI_ASSISTANT_NAME } from '@/lib/ai-brand';
import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';

const messages = [
  'Zisťujeme, kde ti unikajú najhorúcejšie príležitosti…',
  'Počítame buyer readiness index pre každého klienta…',
  'Hľadáme nehnuteľnosti s najväčšou šancou na predaj…',
  'Pripravujeme tvoj personalizovaný dashboard…',
  `${AI_ASSISTANT_NAME} je pripravená.`,
];

export default function AiLoading() {
  const { ref, inView } = useInView({ threshold: 0.4, triggerOnce: true });
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const totalDuration = 5000;
    const msgInterval = totalDuration / (messages.length - 1);

    const msgTimer = setInterval(() => {
      setMsgIndex((p) => {
        if (p >= messages.length - 1) { clearInterval(msgTimer); setDone(true); return p; }
        return p + 1;
      });
    }, msgInterval);

    const progTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(progTimer); return 100; }
        return p + 100 / (totalDuration / 50);
      });
    }, 50);

    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, [inView]);

  return (
    <section ref={ref} className="bg-gradient-to-b from-slate-950 to-slate-900 py-24">
      <div className="mx-auto max-w-lg px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 p-7 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute -inset-px rounded-2xl border border-cyan-300/20 opacity-60 blur-[1px]" />

          <div className="relative w-16 h-16 mx-auto mb-5">
            {!done && <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />}
            <div className="relative w-16 h-16 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <RadiantSpriteIcon icon="revolis-ai" sizeClassName="h-10 w-10" />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300 text-center mb-3">
            AI moment
          </p>
          <h3 className="text-xl font-bold text-slate-50 text-center mb-2" style={{ fontFamily: 'var(--font-syne)' }}>
            Analyzujeme tvoj biznis…
          </h3>
          <p className="text-sm text-slate-400 text-center mb-6">
            Simulujeme tvoj stav klientov, leady a prácu maklérov.
          </p>

          {!done && (
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800 mb-5">
              <motion.div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
              <motion.div
                className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className={`text-sm text-center ${done ? 'text-cyan-300 font-semibold' : 'text-slate-400'}`}
            >
              {messages[msgIndex]}
            </motion.p>
          </AnimatePresence>

          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                className="mt-6 text-center"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all hover:scale-105"
                >
                  Spustiť môj systém
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
