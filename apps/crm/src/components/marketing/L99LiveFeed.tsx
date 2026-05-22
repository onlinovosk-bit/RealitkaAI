"use client";

import { useEffect, useRef, useState } from "react";
import { Circle } from "lucide-react";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

const FEED_ITEMS: { text: string; tone: "red" | "amber" | "blue" | "green" }[] = [
  { text: "Nová exekúcia – Terasa, Prešov", tone: "red" },
  { text: "Dedičstvo zaregistrované – Sekčov", tone: "amber" },
  { text: "Stavebné povolenie – Solivar", tone: "blue" },
  { text: "Predaná nehnuteľnosť – Sídlisko III", tone: "green" },
  { text: "Samopredajca 90 dní – Košice-Staré Mesto", tone: "red" },
  { text: "Zmena vlastníka – Ružinov, Bratislava", tone: "amber" },
  { text: "Nová ponuka pod trhom – Žilina", tone: "blue" },
  { text: "Záujem kupujúceho – Nitra centrum", tone: "green" },
  { text: "Dlh na LV – Petržalka", tone: "red" },
  { text: "Notárska zápisnica – Martin", tone: "amber" },
];

const TONE_COLOR: Record<(typeof FEED_ITEMS)[number]["tone"], string> = {
  red: SLATE_HORIZON.red,
  amber: SLATE_HORIZON.amber,
  blue: SLATE_HORIZON.brand,
  green: SLATE_HORIZON.green,
};

export default function L99LiveFeed() {
  const [offset, setOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const itemWidth = 300;
  const totalWidth = FEED_ITEMS.length * itemWidth;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const speed = 0.01;
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      setOffset((elapsed * speed) % totalWidth);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalWidth, reducedMotion]);

  const items = reducedMotion ? FEED_ITEMS : [...FEED_ITEMS, ...FEED_ITEMS];

  return (
    <div
      className="mb-6 overflow-hidden rounded-2xl border py-3"
      style={{ background: "#FFFFFF", borderColor: SLATE_HORIZON.line, boxShadow: SLATE_HORIZON.cardShadow }}
      aria-live="polite"
      aria-label="Live radar udalostí"
    >
      <div
        className={`flex items-center gap-0 whitespace-nowrap ${reducedMotion ? "flex-wrap justify-center gap-y-2 px-4" : ""}`}
        style={reducedMotion ? undefined : { transform: `translateX(-${offset}px)`, willChange: "transform" }}
      >
        {items.map((item, i) => (
          <span
            key={`${item.text}-${i}`}
            className="inline-flex items-center gap-2 px-6 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: SLATE_HORIZON.deep, minWidth: reducedMotion ? undefined : `${itemWidth}px` }}
          >
            <Circle size={8} fill={TONE_COLOR[item.tone]} stroke="none" aria-hidden />
            {item.text}
            {!reducedMotion && (
              <span className="mx-4" style={{ color: SLATE_HORIZON.line }}>
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
