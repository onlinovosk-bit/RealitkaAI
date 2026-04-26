import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import PricingCards from "@/components/billing/pricing-cards";
import RoiCalculator from "@/components/billing/RoiCalculator";
import CurrentSubscriptionCard from "@/components/billing/current-subscription-card";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import UsageMetricsEnterpriseCard from "@/components/settings/usage-metrics-enterprise-card";
import { safeServerAction } from "@/lib/safe-action";
import { BILLING_PLANS, getCurrentBillingStatus } from "@/lib/billing-store";
import { requireRole } from "@/lib/permissions";
import FeatureComparisonTable from "@/components/billing/FeatureComparisonTable";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireRole(["owner", "manager", "agent"]);
  const params = await searchParams;

  const result = await safeServerAction(
    () => getCurrentBillingStatus(),
    "Nepodarilo sa načítať stav predplatného."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Predplatné"
        description="Správa predplatného a platieb."
      >
        <ErrorState
          title="Predplatné sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const billing = result.data;

  return (
    <ModuleShell
      title="Predplatné"
      description="Správa predplatného a platieb."
    >
      <p className="mb-4 text-[10px] uppercase tracking-wider text-slate-500">
        release: l99-2026-04-26b
      </p>
      {params.checkout === "success" && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Checkout bol úspešne dokončený.
        </div>
      )}

      {params.checkout === "cancel" && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          Checkout bol zrušený.
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Stripe customer</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {billing.hasCustomer ? "Áno" : "Nie"}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Predplatné</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {billing.hasSubscription ? "Aktívne" : "Nie"}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Faktúry</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {billing.invoices.length}
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Portál predplatného</p>
          <div className="mt-3">
            {billing.hasSubscription ? (
              <ManageSubscriptionButton />
            ) : (
              <p className="text-sm" style={{ color: '#475569' }}>
                Dostupné po aktivácii plánu
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6">
        <CurrentSubscriptionCard billing={billing} />
      </section>

      <section className="mb-6">
        <UsageMetricsEnterpriseCard />
      </section>

      <section className="mb-6">
        <RoiCalculator />
      </section>

      <PricingCards
        plans={BILLING_PLANS.map((item) => ({
          key: item.key,
          name: item.name,
          priceLabel: item.priceLabel,
          originalPriceLabel: (item as { originalPriceLabel?: string }).originalPriceLabel,
          description: item.description,
          billingNote: item.billingNote,
          recommended: item.recommended,
          features: [...item.features],
        }))}
      />

      <section className="mt-6">
        <FeatureComparisonTable />
      </section>
    </ModuleShell>
  );
}
