import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValuationWidgetForm } from "@/components/valuation/ValuationWidgetForm";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";
import {
  fetchEnabledTenantBranding,
  getAgencyConfigForSlug,
  mergeTenantWithAgencyConfig,
  resolveTenantAgencyId,
} from "@/lib/valuation/tenant";

type PageProps = {
  params: Promise<{ agencySlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agencySlug } = await params;
  const config = getAgencyConfigForSlug(agencySlug);
  const titleBase = config?.headline ?? "Orientačný odhad nehnuteľnosti";
  const brand = config?.displayName ?? agencySlug;
  return {
    title: `${titleBase} | ${brand}`,
    description: config?.subhead ?? "Orientačný odhad nehnuteľnosti zadarmo.",
    robots: { index: true, follow: true },
  };
}

export default async function ValuationWidgetPage({ params }: PageProps) {
  const { agencySlug } = await params;
  const slug = agencySlug.trim().toLowerCase();

  const supabase = await createClient();
  const branding = await fetchEnabledTenantBranding(supabase, slug);
  if (!branding) notFound();

  const admin = createServiceRoleClient();
  const agencyId = admin ? await resolveTenantAgencyId(admin, slug) : null;
  if (!agencyId) notFound();

  const config = getAgencyConfigForSlug(slug);
  const tenant = {
    ...mergeTenantWithAgencyConfig(branding, config),
    agencyId,
  };

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}
    >
      <div className="mx-auto max-w-2xl text-center">
        {tenant.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.logoUrl} alt={tenant.brandName} className="mx-auto mb-4 h-12 object-contain" />
        )}
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: tenant.primaryColor }}>
          {tenant.brandName}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{tenant.headline}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: SLATE_HORIZON.muted }}>
          {tenant.subhead}
        </p>
      </div>

      <div className="mt-10">
        <ValuationWidgetForm tenant={tenant} />
      </div>

      <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        Technicky zabezpečuje Revolis · údaje spracúva {tenant.brandName} ako prevádzkovateľ.
      </p>
    </main>
  );
}
