"use client";
import { useMemo } from "react";
export function useLandingCtaVariant(): "a" | "b" {
  return useMemo(() => (Math.random() < 0.5 ? "a" : "b"), []);
}
