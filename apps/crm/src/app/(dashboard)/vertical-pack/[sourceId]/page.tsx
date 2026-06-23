import Link from "next/link";
import GuardianPanel from "@/components/property/GuardianPanel";
import ModuleShell from "@/components/shared/module-shell";
import { requireUser } from "@/lib/auth";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { createClient } from "@/lib/supabase/server";
import { buildVerticalPackDemo, loadRealviaPropertyForDemo } from "@/lib/capabilities/vertical-pack-demo";
import { buildGuardianPanelView } from "@/lib/capabilities/quality-guardian";
import { buildGuardianPropertyEditHref } from "@/lib/capabilities/quality-guardian/property-edit-href";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

export const dynamic = "force-dynamic";

const DEFAULT_SOURCE = "13303557";

interface PageProps {
  params: Promise<{ sourceId: string }>;
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background: pass ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
        color: pass ? "#15803d" : "#b91c1c",
      }}
    >
      {pass ? "Guardian PASS" : "Guardian FLAG"}
    </span>
  );
}

export default async function VerticalPackDemoPage({ params }: PageProps) {
  await requireUser();
  const { sourceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let agencyId = "11111111-1111-1111-1111-111111111111";
  if (user) {
    const { profile } = await resolveProfileForAuthUser(supabase, user.id, "agency_id", user.email);
    if (profile?.agency_id) agencyId = profile.agency_id;
  }

  const loaded = await loadRealviaPropertyForDemo(supabase, sourceId || DEFAULT_SOURCE);
  const demo = buildVerticalPackDemo({ agencyId, property: loaded.property });
  const guardianPanel = buildGuardianPanelView({
    completeness: demo.completeness,
    listing: demo.listing,
  });

  return (
    <ModuleShell
      title="Vertical Pack — demo zákazky"
      description={`Capabilities pre source_id=${demo.sourceId}. Banner, listing, deck, microsite, completeness score.`}
    >
      {loaded.fromFixture && (
        <div
          className="mb-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            background: "rgba(250, 204, 21, 0.08)",
            borderColor: "rgba(250, 204, 21, 0.22)",
            color: SLATE_HORIZON.ink,
          }}
        >
          DB riadok nenájdený — zobrazený reálny Smolko fixture (13303557).
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href={`/vertical-pack/${DEFAULT_SOURCE}`} className="underline" style={{ color: SLATE_HORIZON.brand }}>
          13303557
        </Link>
        <Link href="/properties" className="underline" style={{ color: SLATE_HORIZON.muted }}>
          ← Ponuky
        </Link>
      </div>

      <div className="mb-6">
        <GuardianPanel
          view={guardianPanel}
          publishFlowAvailable={false}
          propertyEditHref={buildGuardianPropertyEditHref(demo.sourceId)}
          listingPreviewHref="#listing-preview"
          propertyTitle={demo.propertyTitle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Completeness score
            </h2>
            <span className="text-2xl font-bold tabular-nums" style={{ color: SLATE_HORIZON.brandDeep }}>
              {demo.completeness.scorePercent}%
            </span>
          </div>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {demo.completeness.summary}
          </p>
          <PassBadge pass={demo.completeness.guardian.verdict === "pass"} />
        </section>

        <section
          id="listing-preview"
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Listing generator
            </h2>
            <PassBadge pass={demo.listing.guardian.verdict === "pass"} />
          </div>
          <p className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            {demo.listing.headline}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {demo.listing.body.slice(0, 400)}
            {demo.listing.body.length > 400 ? "…" : ""}
          </p>
        </section>

        <section
          className="rounded-2xl border p-5 lg:col-span-2"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <h2 className="mb-3 text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
            Banner factory
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {demo.banners.map((banner) => (
              <div
                key={banner.state}
                className="rounded-xl border p-4"
                style={{ borderColor: SLATE_HORIZON.softBorder, background: SLATE_HORIZON.soft }}
              >
                <p className="text-xs uppercase tracking-wide" style={{ color: SLATE_HORIZON.muted }}>
                  {banner.state}
                </p>
                <p className="mt-1 font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {banner.headline}
                </p>
                <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
                  {banner.subline}
                </p>
                <div className="mt-2">
                  <PassBadge pass={banner.guardianPass} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Deck (majiteľ)
            </h2>
            <PassBadge pass={demo.deckOwner.guardianPass} />
          </div>
          <ul className="space-y-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {demo.deckOwner.slides.map((slide) => (
              <li key={slide.title}>
                <span className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {slide.title}
                </span>
                {": "}
                {slide.bullets.slice(0, 2).join(" · ")}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Deck (kupujúci)
            </h2>
            <PassBadge pass={demo.deckBuyer.guardianPass} />
          </div>
          <ul className="space-y-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {demo.deckBuyer.slides.map((slide) => (
              <li key={slide.title}>
                <span className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                  {slide.title}
                </span>
                {": "}
                {slide.bullets.slice(0, 2).join(" · ")}
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl border p-5 lg:col-span-2"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
              Property microsite
            </h2>
            <PassBadge pass={demo.microsite.guardianPass} />
          </div>
          <p className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
            {demo.microsite.heroTitle}
          </p>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {demo.microsite.heroSubtitle}
          </p>
          <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            noindex={String(demo.microsite.noindex)} · fotiek: {demo.microsite.imageUrls.length}
          </p>
        </section>
      </div>
    </ModuleShell>
  );
}
