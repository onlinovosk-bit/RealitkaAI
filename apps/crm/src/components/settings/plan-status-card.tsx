export default function PlanStatusCard({
  plan,
  billingStatus,
  canUseFullApp,
}: {
  plan: string;
  billingStatus: string;
  canUseFullApp: boolean;
}) {
  function getBillingStatusLabel(status: string) {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "Aktívne";
      case "trialing":
        return "Skúšobné";
      case "past_due":
        return "Po splatnosti";
      case "unpaid":
        return "Neuhradené";
      case "canceled":
        return "Zrušené";
      case "incomplete":
        return "Neúplné";
      case "incomplete_expired":
        return "Neúplné (expirované)";
      case "paused":
        return "Pozastavené";
      case "no_subscription":
      case "no_subscript":
        return "Bez predplatného";
      default:
        return status || "-";
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Aktuálny plán</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Plán</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{plan}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Stav fakturácie</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{getBillingStatusLabel(billingStatus)}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Aplikácia</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {canUseFullApp ? "Plný režim" : "Obmedzený režim"}
          </p>
        </div>
      </div>
    </div>
  );
}
