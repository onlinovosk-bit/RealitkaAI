import { notFound } from "next/navigation";
import ControlTowerDashboard from "@/components/ai-control-tower/dashboard";
import { loadControlTower } from "@/lib/ai-control-tower/load";
import { canViewFounderMetrics } from "@/lib/metrics/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AiControlTowerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (!canViewFounderMetrics({
    email: user?.email,
    isPlatformAdmin: profile?.is_platform_admin,
  })) {
    notFound();
  }

  let view = null;
  let loadError = false;
  try {
    view = await loadControlTower();
  } catch {
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-500">Internal · Prevádzka</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">AI Control Tower</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Spotreba zo spoločného poolu Model Gateway a z `ai_action_audit`. Limit vendora len z hlavičky API
            alebo z uloženého snímku. Chýbajúci zdroj ostáva Nedostupné.
          </p>
        </header>
        {loadError || !view ? (
          <div
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100"
            data-testid="ai-control-tower-error"
          >
            Vežu sa nepodarilo zložiť. Spotreba, limity ani prognóza nie sú k dispozícii.
          </div>
        ) : (
          <ControlTowerDashboard view={view} />
        )}
      </div>
    </main>
  );
}
