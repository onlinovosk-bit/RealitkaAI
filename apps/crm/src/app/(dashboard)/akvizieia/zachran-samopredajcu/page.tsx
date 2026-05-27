import { StealthRecruiter } from "@/components/marketing/AcquisitionHub";
import { getCurrentProfile } from "@/lib/auth";
import { resolveAccountTierFromProfile } from "@/lib/license/access";

export const metadata = { title: "Zachrán Samopredajcu – Revolis.AI" };

export default async function ZachranSamopredajcuPage() {
  const profile = await getCurrentProfile();
  const accountTier = resolveAccountTierFromProfile(
    profile as {
      account_tier?: string | null;
      ui_role?: string | null;
      role?: string | null;
    } | null,
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Zachrán Samopredajcu</h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Samopredajcovia, ktorí 3 mesiace znižujú cenu — sú vaši najlepší potenciálni klienti. AI ich nájde, ohodnotí a napíše správu presne v správny moment.
        </p>
        {process.env.STEALTH_RECRUITER_DEMO === "1" && (
          <p className="mt-2 text-xs font-semibold" style={{ color: "#FCD34D" }}>
            QA demo režim je aktívny (STEALTH_RECRUITER_DEMO=1).
          </p>
        )}
      </div>
      <StealthRecruiter accountTier={accountTier} />
    </div>
  );
}
