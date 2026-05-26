"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { isInvalidRefreshTokenError } from "@/lib/supabase/auth-session";

/**
 * Pri rozbitých Supabase cookies (preview / zmena projektu) vyčistí session
 * namiesto nekonečných AuthApiError v konzole.
 */
export default function SessionRecovery() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { error } = await supabaseClient.auth.getUser();
      if (cancelled || !error || !isInvalidRefreshTokenError(error)) return;

      try {
        await supabaseClient.auth.signOut();
      } catch {
        /* ignore */
      }

      const login = new URL("/login", window.location.origin);
      login.searchParams.set("reason", "session_expired");
      login.searchParams.set(
        "redirectTo",
        window.location.pathname + window.location.search,
      );
      router.replace(login.pathname + login.search);
    })();

    const { data: sub } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_OUT") return;
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
