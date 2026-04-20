"use client";
import { createContext, useContext, type ReactNode } from "react";

type CtaVariant = "a" | "b";
const CtaAbContext = createContext<CtaVariant>("a");

export function CtaAbProvider({ children }: { children: ReactNode }) {
  return <CtaAbContext.Provider value="a">{children}</CtaAbContext.Provider>;
}

export function useCtaAbVariant(): CtaVariant {
  return useContext(CtaAbContext);
}
