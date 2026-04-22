export type HubTier = "free" | "starter" | "pro" | "enterprise";

export const TIER_LABELS: Record<HubTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise (L99)",
};
