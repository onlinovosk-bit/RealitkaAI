"use client";
import { useFounderDiscountSpots } from "@/components/shared/founder-discount-spots-context";

export default function FounderSpotsLandingStrip() {
  const { spots } = useFounderDiscountSpots();
  if (spots <= 0) return null;

  return (
    <div
      className="mx-auto mb-2 max-w-xl rounded-full px-5 py-2 text-center text-xs font-semibold"
      style={{
        background: "rgba(34,211,238,0.08)",
        border: "1px solid rgba(34,211,238,0.20)",
        color: "#22D3EE",
      }}
    >
      ⚡ Zostáva {spots} zakladateľských miest so zľavou 50 %
    </div>
  );
}
