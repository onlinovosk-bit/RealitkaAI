"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLandingCtaVariant } from "@/hooks/useLandingCtaVariant";
import type { LandingCtaVariant } from "@/lib/landing-cta-ab";

const CtaAbContext = createContext<LandingCtaVariant>("a");

export function CtaAbProvider({ children }: { children: ReactNode }) {
  const variant = useLandingCtaVariant();
  return <CtaAbContext.Provider value={variant}>{children}</CtaAbContext.Provider>;
}

export function useCtaAbVariant(): LandingCtaVariant {
  return useContext(CtaAbContext);
}
