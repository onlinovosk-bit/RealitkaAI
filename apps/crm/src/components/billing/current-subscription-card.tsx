export default function CurrentSubscriptionCard({
  billing,
}: {
  billing: {
    hasCustomer: boolean;
    hasSubscription: boolean;
    customer: {
      id: string;
      email: string | null;
      name: string | null;
    } | null;
    subscription: {
      id: string;
      status: string;
      currency: string;
      currentPeriodEnd: number | null;
      items: Array<{
        id: string;
        priceId: string;
        productId: string;
        interval: string | null;
        amount: number;
      }>;
    } | null;
    invoices: Array<{
      id: string;
      status: string | null;
      amountPaid: number;
      currency: string | null;
      hostedInvoiceUrl: string | null;
      created: number;
    }>;
  };
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Aktuálne predplatné</h2>

      {!billing.hasCustomer ? (
        <p className="mt-4 text-sm text-gray-500">
          Pre tento účet zatiaľ nebol nájdený žiadny Stripe customer.
        </p>
      ) : !billing.hasSubscription ? (
        <p className="mt-4 text-sm text-gray-500">
          Stripe customer existuje, ale aktívne predplatné nebolo nájdené.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Status</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {billing.subscription?.status ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Obdobie končí</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {billing.subscription?.currentPeriodEnd
                  ? new Date(billing.subscription.currentPeriodEnd * 1000).toLocaleDateString("sk-SK")
                  : "-"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900">Posledné faktúry</h3>

            <div className="mt-3 space-y-3">
              {billing.invoices.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Zatiaľ nie sú dostupné žiadne faktúry.
                </div>
              )}

              {billing.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invoice.id}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {invoice.created
                          ? new Date(invoice.created * 1000).toLocaleDateString("sk-SK")
                          : "-"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {(invoice.amountPaid / 100).toLocaleString("sk-SK")} {String(invoice.currency || "").toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{invoice.status || "-"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
