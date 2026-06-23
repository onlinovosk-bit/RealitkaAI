"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/shared/empty-state";
import PropertiesFilters from "@/components/properties/properties-filters";
import PropertyCreateForm from "@/components/properties/property-create-form";
import PropertiesWorkspace from "@/components/properties/properties-workspace";
import SemanticSearchBar from "@/components/search/SemanticSearchBar";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  applyPropertyFilters,
  findPropertyByFocusId,
  getAvailablePropertyLocations,
  loadPropertiesInventory,
  propertyStatusOptions,
  propertyTypeOptions,
  type Property,
  type PropertyFilters,
  type PropertiesSummary,
} from "@/lib/properties-store";

type Props = {
  /** Voliteľný SSR súhrn (malý objekt); zoznam sa vždy načíta v prehliadači kvôli RLS session. */
  initialInventorySummary?: PropertiesSummary;
  profileMissingAgency: boolean;
  filters: PropertyFilters;
  focusSourceId?: string;
  autoOpenEdit?: boolean;
};

const EMPTY_SUMMARY: PropertiesSummary = {
  total: 0,
  active: 0,
  reserved: 0,
  sold: 0,
};

export default function PropertiesPageClient({
  initialInventorySummary,
  profileMissingAgency,
  filters,
  focusSourceId = "",
  autoOpenEdit = false,
}: Props) {
  const [allInventory, setAllInventory] = useState<Property[]>([]);
  const [inventorySummary, setInventorySummary] = useState<PropertiesSummary>(
    initialInventorySummary ?? EMPTY_SUMMARY,
  );
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (!cancelled) {
          setLoadError("Pripojenie k databáze nie je nakonfigurované.");
          setLoading(false);
        }
        return;
      }

      try {
        const inventory = await loadPropertiesInventory(supabase);
        if (cancelled) return;
        setAllInventory(inventory.items);
        setInventorySummary(inventory.summary);
        setLocations(getAvailablePropertyLocations(inventory.items));
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Nepodarilo sa načítať nehnuteľnosti.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const properties = applyPropertyFilters(allInventory, filters);
  const focusProperty = useMemo(
    () => (focusSourceId ? findPropertyByFocusId(allInventory, focusSourceId) : undefined),
    [allInventory, focusSourceId],
  );
  const focusNotFound = Boolean(autoOpenEdit && focusSourceId && !loading && !focusProperty);

  const displayProperties = useMemo(() => {
    if (focusProperty && !properties.some((item) => item.id === focusProperty.id)) {
      return [focusProperty, ...properties];
    }
    return properties;
  }, [properties, focusProperty]);

  const filterNotice =
    !loading &&
    properties.length !== inventorySummary.total &&
    !!(filters.q || filters.status || filters.location || filters.type);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-600">
        Načítavam nehnuteľnosti…
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        title="Nehnuteľnosti sa nepodarilo načítať"
        description={loadError}
      />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <SemanticSearchBar type="properties" className="w-full" />

        <PropertiesFilters
          defaultQ={filters.q ?? ""}
          defaultStatus={filters.status ?? ""}
          defaultLocation={filters.location ?? ""}
          defaultType={filters.type ?? ""}
          statuses={propertyStatusOptions}
          locations={locations}
          types={propertyTypeOptions}
        />

        <PropertyCreateForm />
      </div>

      {focusNotFound ? (
        <div
          data-testid="property-focus-not-found"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p>
            Ponuka <strong>{focusSourceId}</strong> sa v zozname nenašla.
          </p>
          <a href="/properties" className="mt-2 inline-block font-semibold underline">
            Späť na celý zoznam
          </a>
        </div>
      ) : null}

      {filterNotice ? (
        <p className="-mt-3 mb-2 text-center text-xs text-gray-600">
          V tabuľke sú zobrazené <strong>{properties.length}</strong> z{" "}
          <strong>{inventorySummary.total}</strong> nehnuteľností podľa filtrov.&nbsp;
          <a href="/properties" className="font-semibold text-gray-900 underline">
            Reset filtrov
          </a>
        </p>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Celkom (kancelária)</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inventorySummary.total}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Aktívne</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inventorySummary.active}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Rezervované</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inventorySummary.reserved}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Predané</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{inventorySummary.sold}</h2>
        </div>
      </section>

      {displayProperties.length === 0 ? (
        focusNotFound ? null : (
          <EmptyState
            title={
              inventorySummary.total > 0
                ? "Žiadny výsledok po filtroch"
                : "Zatiaľ nemáš žiadne nehnuteľnosti"
            }
            description={
              inventorySummary.total > 0
                ? "Uprav kritériá alebo klikni na Reset v kartičke filtrov."
                : profileMissingAgency
                  ? "V profile chýba agency_id — bez neho RLS neukáže ponuky kancelárie. Skontroluj profil v Supabase."
                  : "Pridaj prvú nehnuteľnosť cez formulár vyššie alebo over Realvia import."
            }
          />
        )
      ) : (
        <PropertiesWorkspace
          properties={displayProperties}
          autoOpenEdit={autoOpenEdit && Boolean(focusProperty)}
          focusProperty={focusProperty ?? null}
        />
      )}
    </>
  );
}
