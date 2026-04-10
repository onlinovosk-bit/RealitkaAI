"use client";
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

function useCountUp(target: number, duration = 1800, trigger = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration, trigger]);
  return val;
}

const METRICS = [
  { prefix: '+', value: 34, suffix: '%', label: 'priemerný rast konverzií', color: '#22D3EE' },
  { prefix: '', value: 2, suffix: ' min', label: 'priemerná odpoveď Sofia', color: '#818CF8' },
  { prefix: '', value: 847, suffix: '', label: 'aktívnych maklérov', color: '#34D399' },
  { prefix: '€', value: 2400, suffix: '', label: 'ušetrených mesačne', color: '#FBBF24' },
];

function MetricCard({
  prefix, value, suffix, label, color, trigger,
}: typeof METRICS[0] & { trigger: boolean }) {
  const count = useCountUp(value, 1800, trigger);
  return (
    <div className="text-center">
      <div
        className="text-5xl sm:text-6xl font-extrabold tabular-nums mb-2"
        style={{ fontFamily: 'var(--font-syne)', color }}
      >
        {prefix}{count.toLocaleString('sk-SK')}{suffix}
      </div>
      <p className="text-sm" style={{ color: '#64748B' }}>{label}</p>
    </div>
  );
}

export default function Metrics() {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <section ref={ref} className="py-24" style={{ background: '#050914' }}>
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-10"
        >
          {METRICS.map((m) => (
            <MetricCard key={m.label} {...m} trigger={inView} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
