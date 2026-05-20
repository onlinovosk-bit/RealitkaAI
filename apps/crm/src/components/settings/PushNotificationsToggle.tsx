"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsToggle() {
  const { permission, isSubscribed, isSupported, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const statusLabel =
    permission === "denied"
      ? "Zablokované v prehliadači"
      : isSubscribed
      ? "Zapnuté"
      : "Vypnuté";

  const statusClass = isSubscribed
    ? "text-emerald-700"
    : permission === "denied"
      ? "text-red-700"
      : "text-slate-600";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-950">
            Push notifikácie
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            HOT leady, denný plán a dôležité upozornenia priamo na mobil.
          </p>
          <p className={`mt-1.5 text-xs font-semibold ${statusClass}`}>
            {statusLabel}
          </p>
        </div>

        <button
          type="button"
          disabled={permission === "denied"}
          onClick={() => void handleToggle()}
          aria-pressed={isSubscribed}
          className={`relative flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
            isSubscribed
              ? "border-blue-600 bg-blue-600"
              : "border-slate-300 bg-slate-200"
          }`}
        >
          <span
            className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
            style={{
              transform: isSubscribed ? "translateX(22px)" : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {permission === "denied" && (
        <p className="mt-3 text-xs text-slate-600">
          Notifikácie sú zablokované. Povoľ ich v nastaveniach prehliadača.
        </p>
      )}
    </section>
  );
}
