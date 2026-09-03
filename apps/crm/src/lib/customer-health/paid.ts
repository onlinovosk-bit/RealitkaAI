/** Paying = manual invoice plan or non-free commercial plan / active subscription. */
export function isPayingAgency(row: {
  plan?: string | null;
  manual_plan?: string | null;
  subscription_status?: string | null;
  account_tier?: string | null;
}): boolean {
  if ((row.manual_plan ?? "").trim()) return true;
  const status = (row.subscription_status ?? "").trim().toLowerCase();
  if (status === "active" || status === "trialing") return true;
  const plan = (row.plan ?? "").trim().toLowerCase();
  if (plan && plan !== "free") return true;
  const tier = (row.account_tier ?? "").trim().toLowerCase();
  if (tier && tier !== "free") return true;
  return false;
}
