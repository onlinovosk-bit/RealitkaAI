import { notFound } from "next/navigation";
import CeoCommandClient from "@/components/ceo-command/CeoCommandClient";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";
import { createClient } from "@/lib/supabase/server";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

export default async function CeoCommandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user?.id ?? "",
    "role, ui_role",
    user?.email,
  );

  if (!isCeoCommandOwner(profile)) {
    notFound();
  }

  return (
    <main className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">CEO Command</h1>
          <p className="mt-1 text-sm text-slate-400">
            Riaditeľské príkazy a briefy z rutín — len pre majiteľa RK.
          </p>
        </div>
        <CeoCommandClient />
      </div>
    </main>
  );
}
