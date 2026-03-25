import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import PropertiesFilters from "@/components/properties/properties-filters";
import PropertyCreateForm from "@/components/properties/property-create-form";
import PropertiesWorkspace from "@/components/properties/properties-workspace";
import {
  getAvailablePropertyLocations,
  listProperties,
  propertyStatusOptions,
  propertyTypeOptions,
} from "@/lib/properties-store";
import { safeServerAction } from "@/lib/safe-action";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    location?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  const filters = {
    q: params.q ?? "",
    status: params.status ?? "",
    location: params.location ?? "",
    type: params.type ?? "",
  };

  const result = await safeServerAction(
    () => listProperties(filters),
    "Nepodarilo sa načítať nehnuteľnosti."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Nehnuteľnosti"
        description="Kompletný modul na správu nehnuteľností a ponúk realitnej kancelárie."
      >
        <ErrorState
          title="Nehnuteľnosti sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const properties = result.data;
  const totalProperties = properties.length;
  const activeProperties = properties.filter((item) => item.status === "Aktívna").length;
  const reservedProperties = properties.filter((item) => item.status === "Rezervovaná").length;
  const avgPrice =
    properties.length > 0
      ? Math.round(
          properties.reduce((sum, item) => sum + item.price, 0) / properties.length
        )
      : 0;

  const locations = getAvailablePropertyLocations(properties);

  return (
    <ModuleShell
      title="Nehnuteľnosti"
      description="Kompletný modul na správu nehnuteľností a ponúk realitnej kancelárie."
    >
      <div className="mb-6 flex flex-col gap-4">
        <PropertiesFilters
          defaultQ={params.q ?? ""}
          defaultStatus={params.status ?? ""}
          defaultLocation={params.location ?? ""}
          defaultType={params.type ?? ""}
          statuses={propertyStatusOptions}
          locations={locations}
          types={propertyTypeOptions}
        />

        <PropertyCreateForm />
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Zobrazené nehnuteľnosti</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalProperties}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Aktívne</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{activeProperties}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Rezervované</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{reservedProperties}</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Priemerná cena</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            {avgPrice.toLocaleString("sk-SK")} €
          </h2>
        </div>
      </section>

      {properties.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne nehnuteľnosti"
          description="Pridaj prvú nehnuteľnosť cez formulár vyššie alebo uprav filtre."
        />
      ) : (
        <PropertiesWorkspace properties={properties} />
      )}
    </ModuleShell>
  );
}
