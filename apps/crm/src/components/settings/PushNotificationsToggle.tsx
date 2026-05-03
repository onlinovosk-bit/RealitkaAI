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

  const statusColor = isSubscribed ? "#22C55E" : permission === "denied" ? "#EF4444" : "#475569";

  return (
    <section
      className="rounded-2xl border p-4 md:p-6"
      style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold" style={{ color: "#F0F9FF" }}>
            Push notifikácie
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "#64748B" }}>
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
            background: isSubscribed
              ? "linear-gradient(135deg, #22D3EE, #0EA5E9)"
              : "rgba(71,85,105,0.4)",
            border: "1px solid rgba(34,211,238,0.15)",
          }}
        >
          <span
            className="h-5 w-5 rounded-full transition-transform duration-200"
            style={{
              background: "#F0F9FF",
              transform: isSubscribed ? "translateX(22px)" : "translateX(2px)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          />
        </button>
      </div>

      {permission === "denied" && (
        <p className="mt-3 text-xs" style={{ color: "#475569" }}>
          Notifikácie sú zablokované. Povoľ ich v nastaveniach prehliadača.
        </p>
      )}
    </section>
  );
}
