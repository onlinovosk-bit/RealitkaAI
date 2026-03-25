"use client";

import Link from "next/link";
import { useState } from "react";

export type LeadMatchItem = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  score: number;
  status: string;
  createdAt: string;
};

const statusOptions = [
  { value: "sent", label: "Odoslané" },
  { value: "viewed", label: "Prezreté" },
  { value: "interested", label: "Záujem" },
  { value: "rejected", label: "Odmietnuté" },
];

function formatLoggedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("sk-SK").format(value);
}

function getStatusClasses(status: string) {
  switch (status) {
    case "interested":
      return "bg-green-100 text-green-700 border-green-200";
    case "viewed":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function LeadMatchesPanel({
  leadId,
  initialMatches,
  onStatusUpdated,
}: {
  leadId: string;
  initialMatches: LeadMatchItem[];
  onStatusUpdated?: () => Promise<void> | void;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleStatusChange(matchId: string, status: string) {
    const previous = matches;
    setSavingId(matchId);
    setMatches((current) =>
      current.map((match) => (match.id === matchId ? { ...match, status } : match))
    );

    try {
      const response = await fetch(`/api/leads/${leadId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa zmeniť stav matchu.");
      }

      setMatches((current) =>
        current.map((match) =>
          match.id === matchId ? { ...match, status: data.match.status } : match
        )
      );

      await onStatusUpdated?.();
    } catch (error) {
      setMatches(previous);
      alert(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa zmeniť stav matchu."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Zapísané matching ponuky</h2>
          <p className="text-sm text-gray-500">
            Nehnuteľnosti, ktoré boli tomuto leadu už odporúčané.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          {matches.length} uložených
        </span>
      </div>

      <div className="space-y-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <Link
                  href={`/matching/${match.propertyId}`}
                  className="font-semibold text-gray-900 hover:text-gray-700"
                >
                  {match.propertyTitle}
                </Link>
                <div className="mt-1 text-sm text-gray-500">{match.propertyLocation}</div>
                <div className="mt-2 text-sm text-gray-700">{formatPrice(match.propertyPrice)} €</div>
                <div className="mt-2 text-xs text-gray-500">
                  Zapísané: {formatLoggedAt(match.createdAt)}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                    Match {match.score}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(match.status)}`}
                  >
                    {statusOptions.find((item) => item.value === match.status)?.label ?? match.status}
                  </span>
                </div>
                <select
                  value={match.status}
                  disabled={savingId === match.id}
                  onChange={(e) => {
                    void handleStatusChange(match.id, e.target.value);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:opacity-60"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {savingId === match.id && option.value === match.status
                        ? "Ukladám..."
                        : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {matches.length === 0 && (
          <p className="text-sm text-gray-500">Zatiaľ nebola uložená žiadna matching ponuka.</p>
        )}
      </div>
    </div>
  );
}
