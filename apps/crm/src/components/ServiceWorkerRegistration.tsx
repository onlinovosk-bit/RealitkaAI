"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js` only when safe for production flows.
 *
 * - Production: registers after load (`updateViaCache: "none"` avoids stale hashed assets).
 * - Development: unregister all SWs unless `NEXT_PUBLIC_SW_DEV=1` (helps ERR_CONNECTION_REFUSED/
 *   oddities from old SW caches and fetch redirect constraints in dev tooling).
 *
 * Used from <ClientProviders /> so the App Router root layout stays a Server Component.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isProdBuild = process.env.NODE_ENV === "production";
    const forceDevRegistration = process.env.NEXT_PUBLIC_SW_DEV === "1";

    /** Clear stale registrations so localhost is not intercepted by an old SW. */
    const unregisterAll = (): void => {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => {});
    };

    if (!isProdBuild && !forceDevRegistration) {
      unregisterAll();
      return;
    }

    const registerSafe = (): void => {
      void navigator.serviceWorker
        .register("/sw.js", {
          updateViaCache: "none",
          type: "classic",
        })
        .catch((err: unknown) => {
          console.error("[ServiceWorkerRegistration] registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      registerSafe();
      return;
    }

    window.addEventListener("load", registerSafe, { once: true });
    return () => window.removeEventListener("load", registerSafe);
  }, []);

  return null;
}
