export const STEPS = [
  { index: 1, slug: "step-1-vitaj",       label: "Vitaj",       emoji: "🚀" },
  { index: 2, slug: "step-2-realitka",    label: "Realitka",    emoji: "🏢" },
  { index: 3, slug: "step-3-profil",      label: "Profil",      emoji: "👤" },
  { index: 4, slug: "step-4-ai-asistent", label: "AI Asistent", emoji: "🤖" },
  { index: 5, slug: "step-5-import",      label: "Import",      emoji: "📋" },
  { index: 6, slug: "step-6-pipeline",    label: "Pipeline",    emoji: "🏗️" },
  { index: 7, slug: "step-7-prepojenia",  label: "Prepojenia",  emoji: "🔗" },
  { index: 8, slug: "step-8-ciele",       label: "Ciele",       emoji: "🎯" },
  { index: 9, slug: "step-9-hotovo",      label: "Hotovo!",     emoji: "✅" },
] as const;

export type StepSlug = typeof STEPS[number]["slug"];
export const STEP_SLUGS = STEPS.map(s => s.slug);

export function getStepBySlug(slug: string) {
  return STEPS.find(s => s.slug === slug) ?? null;
}
export function getNextSlug(slug: string): string | null {
  const idx = STEPS.findIndex(s => s.slug === slug);
  return idx >= 0 && idx < STEPS.length - 1 ? STEPS[idx + 1].slug : null;
}
export function getPrevSlug(slug: string): string | null {
  const idx = STEPS.findIndex(s => s.slug === slug);
  return idx > 0 ? STEPS[idx - 1].slug : null;
}
