import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { isPlatformOwnerEmail } from "@/lib/platform-admin";

/**
 * Admin sekcia (/admin/*) – len účty uvedené v PLATFORM_OWNER_EMAILS (nastavené v Vercel / .env).
 * Tenantová rola „owner“ sa riadi cez profiles.role; toto je samostatná platformová vrstva.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.email) {
    redirect("/login");
  }
  const e2eBypass = process.env.E2E_BYPASS_AUTH === "1" && process.env.NODE_ENV !== "production";
  if (!e2eBypass && !isPlatformOwnerEmail(user.email)) {
    redirect("/forbidden");
  }
  return <>{children}</>;
}
