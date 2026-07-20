import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ValuationWidgetForm } from "@/components/valuation/ValuationWidgetForm";
import { getValuationAgency } from "@/lib/valuation/agency-config";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

type PageProps = {
  params: Promise<{ agencySlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { agencySlug } = await params;
  const agency = getValuationAgency(agencySlug);
  if (!agency) {
    return { title: "Odhad nehnuteľnosti | Revolis" };
  }
  return {
    title: `${agency.headline} | ${agency.displayName}`,
    description: agency.subhead,
    robots: { index: true, follow: true },
  };
}

export default async function ValuationWidgetPage({ params }: PageProps) {
  const { agencySlug } = await params;
  const agency = getValuationAgency(agencySlug);
  if (!agency) notFound();

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brand }}>
          {agency.displayName}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{agency.headline}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed sm:text-base" style={{ color: SLATE_HORIZON.muted }}>
          {agency.subhead}
        </p>
      </div>

      <div className="mt-10">
        <ValuationWidgetForm agency={agency} />
      </div>

      <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
        Technicky zabezpečuje Revolis · údaje spracúva {agency.displayName} ako prevádzkovateľ.
      </p>
    </main>
  );
}
