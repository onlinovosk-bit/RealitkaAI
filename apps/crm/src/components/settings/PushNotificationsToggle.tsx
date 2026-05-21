"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

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

  const statusColor = isSubscribed
    ? SLATE_HORIZON.greenDark
    : permission === "denied"
      ? SLATE_HORIZON.red
      : SLATE_HORIZON.muted;

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="border-b p-4 md:p-6" style={{ borderColor: WORKDESK_CARD.borderColor }}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Push notifikácie
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              HOT leady, denný plán a dôležité upozornenia priamo na mobil.
            </p>
            <p className="mt-1.5 text-xs font-medium" style={{ color: statusColor }}>
              {statusLabel}
            </p>
          </div>

          <button
            type="button"
            disabled={permission === "denied"}
            onClick={() => void handleToggle()}
            aria-pressed={isSubscribed}
            className="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: isSubscribed ? SLATE_HORIZON.brandDeep : SLATE_HORIZON.line,
              border: `1px solid ${isSubscribed ? SLATE_HORIZON.brand : SLATE_HORIZON.line}`,
            }}
          >
            <span
              className="h-5 w-5 rounded-full transition-transform duration-200"
              style={{
                background: "#FFFFFF",
                transform: isSubscribed ? "translateX(22px)" : "translateX(2px)",
                boxShadow: "0 1px 3px rgba(15,23,42,0.12)",
              }}
            />
          </button>
        </div>
      </div>

      {permission === "denied" && (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
            Notifikácie sú zablokované. Povoľ ich v nastaveniach prehliadača.
          </p>
        </div>
      )}
    </section>
  );
}
