"use client";
import { useFounderDiscountSpots } from "@/components/shared/founder-discount-spots-context";

export function FounderDiscountSpotsCounter() {
  const { spots, decrement } = useFounderDiscountSpots();

  if (spots <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cyan-400">{spots} miest zostáva</span>
      <button
        onClick={decrement}
        className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900"
      >
        Rezervovať
      </button>
    </div>
  );
}
