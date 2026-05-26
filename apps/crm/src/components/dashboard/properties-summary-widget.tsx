"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PropertiesSummary } from "@/lib/properties-store";

type Props = {
  /** Ak príde z RSC/dashboard SSR, použijeme hodnoty hneď a nezávodíme s RLS v prehliadači o prvý fetch. */
  serverSummary?: PropertiesSummary;
};

export default function PropertiesSummaryWidget({ serverSummary }: Props) {
  const hydratedFromServer = serverSummary !== undefined;
  const [summary, setSummary] = useState<PropertiesSummary | null>(
    hydratedFromServer ? serverSummary : null,
  );
  const [isLoading, setIsLoading] = useState(!hydratedFromServer);

  useEffect(() => {
    if (hydratedFromServer) {
      setSummary(serverSummary);
      setIsLoading(false);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch("/api/properties/inventory", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          inventory?: { summary: PropertiesSummary };
        };
        if (res.ok && data.ok && data.inventory?.summary) {
          setSummary(data.inventory.summary);
        }
      } catch (err) {
        console.error("Error loading properties summary:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [hydratedFromServer, serverSummary]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Nehnuteľnosti</h3>
        <div className="text-center text-gray-500">Načítavam...</div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Nehnuteľnosti</h3>
        <Link 
          href="/properties" 
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Pozri všetky →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Celkovo</p>
          <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Aktívne</p>
          <p className="text-2xl font-bold text-green-600">{summary.active}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Rezervované</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.reserved}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-gray-600 mb-1">Predané</p>
          <p className="text-2xl font-bold text-blue-600">{summary.sold}</p>
        </div>
      </div>

      <Link
        href="/properties"
        className="block mt-4 text-center py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm font-medium"
      >
        Spravovať nehnuteľnosti
      </Link>
    </div>
  );
}
