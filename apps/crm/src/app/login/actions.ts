"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizeNextPath(value: string) {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
}

function canAccessPath(pathname: string, role: string | null) {
  if (pathname.startsWith("/settings")) {
    return role === "owner";
  }

  if (pathname.startsWith("/team")) {
    return role === "owner" || role === "manager";
  }

  return true;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? "/dashboard"));

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const authUserId = data.user?.id;

  if (authUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    const role = profile?.role ?? null;
    if (!canAccessPath(nextPath, role)) {
      redirect("/dashboard");
    }
  }

  redirect(nextPath || "/dashboard");
}
