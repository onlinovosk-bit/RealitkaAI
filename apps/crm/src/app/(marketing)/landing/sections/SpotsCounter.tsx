'use client';

import { useEffect, useState } from 'react';

const TOTAL_SPOTS = 20;
const INITIAL_TAKEN = 13;

export default function SpotsCounter() {
  const [taken, setTaken] = useState(INITIAL_TAKEN);

  useEffect(() => {
    // Simulate spots filling over time (random interval between 45–180 seconds)
    function scheduleNext() {
      const delay = (45 + Math.random() * 135) * 1000;
      return setTimeout(() => {
        setTaken((prev) => {
          if (prev < TOTAL_SPOTS - 1) {
            scheduleNext();
            return prev + 1;
          }
          return prev;
        });
      }, delay);
    }
    const t = scheduleNext();
    return () => clearTimeout(t);
  }, []);

  const remaining = TOTAL_SPOTS - taken;
  const filledPercent = (taken / TOTAL_SPOTS) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          Obsadené miesta:{' '}
          <strong className="text-white">{taken}/{TOTAL_SPOTS}</strong>
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: remaining <= 3 ? '#F87171' : remaining <= 7 ? '#FBBF24' : '#34D399' }}
        >
          {remaining === 0
            ? 'Vypredané!'
            : remaining === 1
            ? '⚠ Posledné 1 miesto!'
            : remaining <= 3
            ? `⚠ Posledné ${remaining} miesta!`
            : remaining <= 7
            ? `${remaining} miest zostáva`
            : `${remaining} miest dostupných`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${filledPercent}%`,
            background:
              remaining <= 3
                ? 'linear-gradient(90deg, #F87171, #EF4444)'
                : remaining <= 7
                ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                : 'linear-gradient(90deg, #34D399, #22D3EE)',
          }}
        />
      </div>
    </div>
  );
}
