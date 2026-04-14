import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export default function PlanSelectorCard({
  plan,
}: {
  plan: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Správa plánu</h2>
      <p className="mt-3 text-sm text-gray-500">
        Aktuálne používaš plán <strong>{plan}</strong>. Zmenu tarifu, platobnej metódy
        alebo fakturačných údajov spravíš cez portál predplatného.
      </p>

      <div className="mt-6">
        <ManageSubscriptionButton />
      </div>
    </div>
  );
}
