"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/shared/empty-state";
import PropertiesFilters from "@/components/properties/properties-filters";
import PropertyCreateForm from "@/components/properties/property-create-form";
import PropertiesWorkspace from "@/components/properties/properties-workspace";
import SemanticSearchBar from "@/components/search/SemanticSearchBar";
import {
  applyPropertyFilters,
  getAvailablePropertyLocations,
  propertyStatusOptions,
  propertyTypeOptions,
  type Property,
  type PropertyFilters,
  type PropertiesSummary,
} from "@/lib/properties-store";

type Props = {
  /** Celý inventár kancelárie (pred URL filtrami). */
  initialAllInventory: Property[];
  initialInventorySummary: PropertiesSummary;
  initialLocations: string[];
  profileMissingAgency: boolean;
  filters: PropertyFilters;
};

type InventoryPayload = {
  ok?: boolean;
  inventory?: {
    items: Property[];
    summary: PropertiesSummary;
  };
  error?: string;
};

export default function PropertiesPageClient({
  initialAllInventory,
  initialInventorySummary,
  initialLocations,
  profileMissingAgency,
  filters,
}: Props) {
  const [allInventory, setAllInventory] = useState<Property[]>(initialAllInventory);
  const [inventorySummary, setInventorySummary] =
    useState<PropertiesSummary>(initialInventorySummary);
  const [locations, setLocations] = useState<string[]>(initialLocations);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const properties = applyPropertyFilters(allInventory, filters);

  const filterNotice =
    properties.length !== inventorySummary.total &&
    !!(filters.q || filters.status || filters.location || filters.type);

  useEffect(() => {
    if (initialInventorySummary.total > 0) return;

    let cancelled = false;

    const syncFromSession = async () => {
      try {
        const res = await fetch("/api/properties/inventory", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as InventoryPayload;
        if (cancelled || !res.ok || !data.ok || !data.inventory) return;

        const { items, summary } = data.inventory;
        if (summary.total === 0) return;

        setAllInventory(items);
        setInventorySummary(summary);
        setLocations(getAvailablePropertyLocations(items));
        setSyncNotice(
          "Zoznam bol doplnený z aktívnej relácie — server pri prvom načítaní nevidel inventár (session/RLS).",
        );
      } catch {
        // ticho — ostáva SSR stav
      }
    };

    void syncFromSession();
    return () => {
      cancelled = true;
    };
  }, [initialInventorySummary.total]);

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

      {syncNotice ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {syncNotice}
        </p>
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

      {properties.length === 0 ? (
        <EmptyState
          title={
            inventorySummary.total > 0
              ? "Žiadny výsledok po filtroch"
              : "Zatiaľ nemáš žiadne nehnuteľnosti"
          }
          description={
            inventorySummary.total > 0
              ? "Uprav kritériá alebo klikni na Reset v kartičke filtrov — v kancelárii máš nehnuteľnosti v súhrne vyššie."
              : profileMissingAgency
                ? "Najskôr doplň agency_id vo svojom profile. Potom obnov stránku."
                : "Pridaj prvú nehnuteľnosť cez formulár vyššie alebo uprav filtre."
          }
        />
      ) : (
        <PropertiesWorkspace properties={properties} />
      )}
    </>
  );
}
