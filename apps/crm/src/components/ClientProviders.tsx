"use client";

import type { ReactNode } from "react";

import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

type ClientProvidersProps = {
  children: ReactNode;
};

/**
 * Client boundary for the root layout. Keep `app/layout.tsx` as a Server Component.
 *
 * Provider slots (add wrappers here only after the dependency exists in package.json):
 * - TanStack Query: QueryClientProvider
 * - Theming: ThemeProvider (e.g. next-themes)
 * - Auth session: SessionProvider (library-specific)
 * - Toasts: Toaster / Sonner / similar
 */
export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <>
      {children}
      <ServiceWorkerRegistration />
    </>
  );
}
