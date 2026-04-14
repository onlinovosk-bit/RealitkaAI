import { APP_MODE_COOKIE } from "@/lib/app-mode-types";

/**
 * Demo režim z cookie (Topbar toggle). Volaj len z async server kontextu.
 * V prehliadači, Pages Router a skriptoch vždy false — bez statického importu next/headers.
 */
export async function readDemoModeFromCookie(): Promise<boolean> {
  if (typeof window !== "undefined") {
    return false;
  }

  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return jar.get(APP_MODE_COOKIE)?.value === "demo";
  } catch {
    return false;
  }
}
