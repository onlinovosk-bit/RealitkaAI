import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Iba pre Playwright / lokálne E2E — nikdy v produkcii (NODE_ENV=production). */
function isE2eAuthBypass(): boolean {
  return (
    process.env.E2E_BYPASS_AUTH === "1" && process.env.NODE_ENV !== "production"
  );
}

function e2eMockUser(): User {
  return {
    id: "e2e-bypass-user",
    aud: "authenticated",
    role: "authenticated",
    email: "e2e-bypass@local.test",
    email_confirmed_at: new Date().toISOString(),
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User;
}

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(url && key);
}

// Client-side token helper (used by api.ts)
const TOKEN_KEY = "access_token";
export const auth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `token=${token}; path=/`;
  },
  logout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "token=; Max-Age=0; path=/";
  },
};

export type CurrentProfile = {
  id: string;
  agency_id: string | null;
  team_id: string | null;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
};

function e2eMockProfile(): CurrentProfile {
  return {
    id: "e2e-profile-id",
    agency_id: null,
    team_id: null,
    auth_user_id: "e2e-bypass-user",
    full_name: "E2E Bypass",
    email: "e2e-bypass@local.test",
    role: "owner",
    phone: null,
    is_active: true,
  };
}

export async function getCurrentUser() {
  if (isE2eAuthBypass()) {
    return e2eMockUser();
  }
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    // Invalid cookies/session payload should never crash routing.
    return null;
  }
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (isE2eAuthBypass()) {
    return e2eMockProfile();
  }
  if (!hasSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();

    const user = userData.user;
    if (!user) return null;

    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const fallback = await supabase
        .from("profiles")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      profile = fallback.data ?? null;

      if (profile && !profile.auth_user_id) {
        await supabase
          .from("profiles")
          .update({ auth_user_id: user.id })
          .eq("id", profile.id);

        profile = { ...profile, auth_user_id: user.id };
      }
    }

    return profile ?? null;
  } catch {
    // Protect dashboard/login routing from transient auth backend errors.
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
