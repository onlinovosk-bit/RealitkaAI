"use client";
import { createContext, useContext, useState, type ReactNode } from "react";

type SpotsCtx = { spots: number; decrement: () => void };
const Ctx = createContext<SpotsCtx>({ spots: 20, decrement: () => {} });

export function FounderDiscountSpotsProvider({ children }: { children: ReactNode }) {
  const [spots, setSpots] = useState(20);
  return (
    <Ctx.Provider value={{ spots, decrement: () => setSpots((s) => Math.max(0, s - 1)) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFounderDiscountSpots() {
  return useContext(Ctx);
}
