'use client';

import { useEffect, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export default function CountdownTimer() {
  const [time, setTime] = useState(getTimeUntilMidnight());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400 mr-1">Cena stúpa o:</span>
      {[
        { value: time.hours, label: 'hod' },
        { value: time.minutes, label: 'min' },
        { value: time.seconds, label: 'sek' },
      ].map(({ value, label }, i) => (
        <span key={label} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-600 text-sm font-bold">:</span>}
          <span className="inline-flex flex-col items-center">
            <span
              className="font-mono font-bold text-lg text-cyan-300 tabular-nums leading-none"
              style={{ textShadow: '0 0 20px rgba(34,211,238,0.5)' }}
            >
              {pad(value)}
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
