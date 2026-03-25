import Link from "next/link";
import { getProperty } from "@/lib/properties-store";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">Nehnuteľnosť sa nenašla.</p>
        <Link href="/properties" className="text-blue-600 hover:underline">
          Späť na zoznam nehnuteľností
        </Link>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/properties" className="text-blue-600 hover:underline">
          ← Späť na zoznam nehnuteľností
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
          <p className="text-gray-500 mt-1">{property.location}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b">
          <div>
            <p className="text-sm text-gray-500">Cena</p>
            <p className="text-2xl font-bold text-gray-900">{property.price.toLocaleString("sk-SK")} €</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Typ</p>
            <p className="text-2xl font-bold text-gray-900">{property.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Izby</p>
            <p className="text-2xl font-bold text-gray-900">{property.rooms}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Stav</p>
            <p className="text-2xl font-bold text-gray-900">{property.status}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Popis</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{property.description || "-"}</p>
          </div>

          {property.features.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Features</h2>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature) => (
                  <span key={feature} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Vlastník</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Meno</dt>
                  <dd className="font-medium text-gray-900">{property.ownerName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Telefón</dt>
                  <dd className="font-medium text-gray-900">{property.ownerPhone || "-"}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Metaúdaje</h2>
              <dl className="space-y-3">
                {property.createdAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Vytvorená</dt>
                    <dd className="font-medium text-gray-900">{new Date(property.createdAt).toLocaleDateString("sk-SK")}</dd>
                  </div>
                )}
                {property.updatedAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Posledná úprava</dt>
                    <dd className="font-medium text-gray-900">{new Date(property.updatedAt).toLocaleDateString("sk-SK")}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
