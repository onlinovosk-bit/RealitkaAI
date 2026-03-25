import { createClient } from "@/lib/supabase/server";

export async function ensureProfile(user: any) {
  const supabase = await createClient();

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const role = !count || count === 0 ? "owner" : "agent";

    const { data } = await supabase
      .from("profiles")
      .insert({
        auth_user_id: user.id,
        email: user.email,
        full_name: user.email,
        role,
        is_active: true,
      })
      .select()
      .single();

    return data;
  }

  return profile;
}
