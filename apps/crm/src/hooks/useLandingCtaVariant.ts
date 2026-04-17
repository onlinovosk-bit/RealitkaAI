"use client";

import { useEffect, useState } from "react";
import {
  LANDING_CTA_AB_STORAGE_KEY,
  type LandingCtaVariant,
} from "@/lib/landing-cta-ab";

/**
 * Stabilná 50/50 varianta pre A/B test CTA na landing sekcii (persist v localStorage).
 */
export function useLandingCtaVariant(): LandingCtaVariant {
  const [variant, setVariant] = useState<LandingCtaVariant>("a");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LANDING_CTA_AB_STORAGE_KEY);
      if (raw === "a" || raw === "b") {
        setVariant(raw);
        return;
      }
      const next: LandingCtaVariant = Math.random() < 0.5 ? "a" : "b";
      localStorage.setItem(LANDING_CTA_AB_STORAGE_KEY, next);
      setVariant(next);
    } catch {
      setVariant("a");
    }
  }, []);

  return variant;
}
