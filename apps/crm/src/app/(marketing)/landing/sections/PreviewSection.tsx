'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PreviewSection() {
  return (
    <section className="bg-slate-950 py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-14">
          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
            className="flex-1 space-y-6"
          >
            <p className="text-sm text-cyan-400 uppercase tracking-[0.3em]">Tvoj nový systém</p>
            <h2
              className="text-4xl sm:text-5xl font-extrabold text-white leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Toto je tvoj nový systém.
            </h2>
            <p className="text-lg text-slate-300">
              Jeden pohľad a vieš: kto je pripravený kúpiť, ktoré nehnuteľnosti mu sedí
              a čo má tvoj tím spraviť dnes. Bez hádania, bez chaosu.
            </p>
            <ul className="space-y-3 text-sm text-slate-400">
              {[
                '📊 AI skóre pripravenosti pre každého klienta',
                '🏠 Automatické párovanie klientov s nehnuteľnosťami',
                '⚡ Denné priority pre každého makléra v tíme',
                '📱 Notifikácie keď je klient pripravený na akciu',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.6)] transition-all hover:scale-105 hover:bg-cyan-300 active:scale-95"
            >
              ✦ Začať za 30 sekúnd
            </Link>
            <p className="text-xs text-slate-500">Nepotrebuješ kreditnú kartu. Prvých 30 dní zadarmo.</p>
          </motion.div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: '-80px' }}
            className="flex-1 w-full max-w-xl"
          >
            <div className="relative">
              <div className="absolute -inset-4 bg-cyan-500/[0.08] blur-2xl rounded-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-[0_0_60px_rgba(15,23,42,0.85)] backdrop-blur-2xl">
                <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="rounded-full bg-slate-800/90 px-2.5 py-1 font-medium text-cyan-200">
                    Revolis.AI • Dashboard
                  </span>
                  <span className="text-slate-600">Buyer readiness · Hot leads · Pipeline</span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {/* Chart */}
                  <div className="col-span-2 rounded-2xl bg-slate-950/80 p-3">
                    <p className="text-xs font-medium text-slate-400 mb-2">Buyer readiness dnes</p>
                    <div className="flex items-end gap-1.5 h-16">
                      {[80, 55, 40, 65, 90, 35, 70].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                          viewport={{ once: true }}
                          className="flex-1 rounded-t-full"
                          style={{
                            background:
                              h > 70
                                ? 'linear-gradient(to top, #0e7490, #22d3ee)'
                                : 'linear-gradient(to top, #1e293b, #475569)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      AI zvýrazní top 10 klientov pripravených na akciu.
                    </p>
                  </div>

                  {/* Right col */}
                  <div className="flex flex-col gap-2">
                    <div className="rounded-2xl bg-slate-950/80 p-3">
                      <p className="text-xs font-medium text-slate-400">Hot leads dnes</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <motion.span
                          className="text-2xl font-bold text-cyan-300"
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          12
                        </motion.span>
                        <span className="text-[10px] text-green-400">▲ +3</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">3 telefonáty · 2 follow-upy</p>
                    </div>

                    <div className="rounded-2xl bg-slate-950/80 p-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Pipeline</p>
                      <div className="flex gap-1 text-[9px]">
                        {['Nové', 'Aktívne', 'Uzavreté'].map((s, i) => (
                          <span
                            key={s}
                            className={`flex-1 rounded-full px-1.5 py-1 text-center font-medium
                              ${i === 2 ? 'bg-cyan-400/90 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-950/80 p-3 flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"
                  />
                  <p className="text-xs text-slate-400">
                    <span className="text-cyan-300 font-medium">Sofia navrhuje:</span>{' '}
                    Zavolajte Martinovi Kováčovi — jeho záujem o byt na Ružinove vzrástol o 47 %.
                  </p>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-cyan-300/20 opacity-50" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
