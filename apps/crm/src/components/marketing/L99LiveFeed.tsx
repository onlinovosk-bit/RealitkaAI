"use client";
import { useEffect, useRef, useState } from "react";

const FEED_ITEMS = [
  "🔴 Nová exekúcia – Terasa, Prešov",
  "🟡 Dedičstvo zaregistrované – Sekčov",
  "🔵 Stavebné povolenie – Solivar",
  "🟢 Predaná nehnuteľnosť – Sídlisko III",
  "🔴 Samopredajca 90 dní – Košice-Staré Mesto",
  "🟡 Zmena vlastníka – Ružinov, Bratislava",
  "🔵 Nová ponuka pod trhom – Žilina",
  "🟢 Záujem kupujúceho – Nitra centrum",
  "🔴 Dlh na LV – Petržalka",
  "🟡 Notárska zápisnica – Martin",
];

export default function L99LiveFeed() {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const itemWidth = 280;
  const totalWidth = FEED_ITEMS.length * itemWidth;

  useEffect(() => {
    const speed = 0.08; // px/ms → ~4.8px/s (levitovanie namiesto rýchleho tickeru)
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      setOffset((elapsed * speed) % totalWidth);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [totalWidth]);

  const items = [...FEED_ITEMS, ...FEED_ITEMS];

  return (
    <div
      className="overflow-hidden mb-6 rounded-2xl py-2"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div
        className="flex items-center gap-0 whitespace-nowrap"
        style={{ transform: `translateX(-${offset}px)`, willChange: "transform" }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-6"
            style={{ color: "#334155", minWidth: `${itemWidth}px` }}
          >
            {item}
            <span className="mx-4 text-[#1E293B]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
