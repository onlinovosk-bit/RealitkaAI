'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RadiantSpriteIcon, type RadiantIconKey } from '@/components/shared/radiant-sprite-icon';

const goals = [
  { id: 'hot-leads', icon: 'leads' as RadiantIconKey, title: 'Chcem viac horúcich záujemcov', desc: 'Prioritizuj mi klientov, ktorí sú pripravení kúpiť.' },
  { id: 'pipeline', icon: 'pipeline' as RadiantIconKey, title: 'Chcem mať poriadok v stave klientov', desc: 'Jeden pohľad na všetkých klientov a ich stav.' },
  { id: 'predict', icon: 'revolis-ai' as RadiantIconKey, title: 'Chcem vedieť, kto kúpi v 90 dňoch', desc: 'AI predikcia pripravenosti pre každého klienta.' },
  { id: 'team', icon: 'tasks' as RadiantIconKey, title: 'Makléri majú vedieť, čo robiť každý deň', desc: 'Automatické úlohy a priority pre celý tím.' },
];

export default function GoalsSlider() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedGoals = useMemo(
    () => goals.filter((g) => selectedIds.includes(g.id)),
    [selectedIds],
  );

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <section className="bg-slate-950 py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <p className="text-sm text-cyan-400 uppercase tracking-[0.3em] mb-4">Personalizácia</p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold text-white mb-4"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Čo chceš dosiahnuť?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Vyber jeden alebo viac cieľov — môžeš ich ľubovoľne kombinovať (napr. dve, tri alebo všetky štyri).
            Prispôsobíme ti náhľad systému podľa zvolenej kombinácie.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {goals.map((goal, i) => {
            const isActive = selectedIds.includes(goal.id);
            return (
              <motion.button
                key={goal.id}
                type="button"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, margin: '-40px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(goal.id)}
                className={`relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all duration-300 cursor-pointer
                  ${isActive
                    ? 'border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.35)]'
                    : 'border-slate-700/70 bg-slate-900/70 hover:border-cyan-300/50 hover:bg-slate-900'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId={`goal-bg-${goal.id}`}
                    className="absolute inset-0 rounded-2xl bg-cyan-500/5"
                  />
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <RadiantSpriteIcon icon={goal.icon} sizeClassName="h-9 w-9" />
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center"
                    >
                      <span className="text-slate-950 text-xs font-bold">OK</span>
                    </motion.div>
                  )}
                </div>
                <div className="relative z-10">
                  <p className="font-bold text-slate-50 mb-1" style={{ fontFamily: 'var(--font-syne)' }}>
                    {goal.title}
                  </p>
                  <p className="text-xs text-slate-400">{goal.desc}</p>
                </div>
                <span
                  className={`relative z-10 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold transition-colors
                    ${isActive ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                >
                  {isActive ? 'Vybraté' : 'Klikni pre výber'}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selectedGoals.length > 0 && (
            <motion.div
              key={selectedIds.join(',')}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center"
            >
              <div className="text-slate-300 mb-6">
                <p>Super. Zameriame Revolis.AI na tieto ciele:</p>
                <ul className="mt-3 mx-auto max-w-xl list-none space-y-2 text-left text-sm font-semibold text-cyan-300">
                  {selectedGoals.map((g) => (
                    <li key={g.id} className="border-l-2 border-cyan-500/40 pl-2">
                      &ldquo;{g.title}&rdquo;
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-center text-sm font-normal text-slate-400">
                  V ďalšom kroku ti ukážeme, ako bude vyzerať tvoj prehľad.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all hover:scale-105 hover:bg-cyan-300"
              >
                {selectedGoals.length === 1
                  ? 'Spustiť Revolis.AI pre tento cieľ'
                  : 'Spustiť Revolis.AI s týmito cieľmi'}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
