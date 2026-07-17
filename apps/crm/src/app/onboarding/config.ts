export const STEPS = [
  { index: 1, slug: "step-1-vitaj",       label: "Vitaj",       emoji: "🚀" },
  { index: 2, slug: "step-2-realitka",    label: "Realitka",    emoji: "🏢" },
  { index: 3, slug: "step-3-profil",      label: "Profil",      emoji: "👤" },
  { index: 4, slug: "step-4-ai-asistent", label: "AI Asistent", emoji: "🤖" },
  { index: 5, slug: "step-5-import",      label: "Import",      emoji: "📋" },
  { index: 6, slug: "step-6-pipeline",    label: "Stav klientov",    emoji: "🏗️" },
  { index: 7, slug: "step-7-prepojenia",  label: "Prepojenia",  emoji: "🔗" },
  { index: 8, slug: "step-8-ciele",       label: "Ciele",       emoji: "🎯" },
  { index: 9, slug: "step-audit",         label: "Prehľad",     emoji: "⏱️" },
  { index: 10, slug: "step-9-hotovo",     label: "Hotovo!",     emoji: "✅" },
] as const;

/** Livappy-style short path: vitaj → import → 60s audit → hotovo */
export const SHORT_PATH_SLUGS = [
  "step-1-vitaj",
  "step-5-import",
  "step-audit",
  "step-9-hotovo",
] as const;

export type OnboardingPathMode = "full" | "short";

export type StepSlug = (typeof STEPS)[number]["slug"];
export const STEP_SLUGS = STEPS.map((s) => s.slug);

export function getStepBySlug(slug: string) {
  return STEPS.find((s) => s.slug === slug) ?? null;
}

function pathSlugs(mode: OnboardingPathMode): readonly string[] {
  return mode === "short" ? SHORT_PATH_SLUGS : STEP_SLUGS;
}

export function getNextSlug(slug: string, mode: OnboardingPathMode = "full"): string | null {
  const steps = pathSlugs(mode);
  const idx = steps.indexOf(slug);
  return idx >= 0 && idx < steps.length - 1 ? steps[idx + 1]! : null;
}

export function getPrevSlug(slug: string, mode: OnboardingPathMode = "full"): string | null {
  const steps = pathSlugs(mode);
  const idx = steps.indexOf(slug);
  return idx > 0 ? steps[idx - 1]! : null;
}

export function getPathProgress(slug: string, mode: OnboardingPathMode): {
  current: number;
  total: number;
} {
  const steps = pathSlugs(mode);
  const idx = steps.indexOf(slug);
  return {
    current: idx >= 0 ? idx + 1 : 1,
    total: steps.length,
  };
}
