/** UX helpers for leads list — source badges + relative last contact (no date-fns). */

export const SOURCE_COLORS: Record<string, string> = {
  realvia_import_smolko: "bg-blue-100 text-blue-700",
  realvia: "bg-blue-100 text-blue-700",
  manual: "bg-gray-100 text-gray-600",
  universal_import: "bg-purple-100 text-purple-700",
  web: "bg-green-100 text-green-700",
};

export const SOURCE_LABELS: Record<string, string> = {
  realvia_import_smolko: "Realvia",
  realvia: "Realvia",
  manual: "Manuálny",
  universal_import: "Import",
  web: "Web",
};

export function sourceBadgeLabel(source?: string | null): string {
  if (!source) return "—";
  return SOURCE_LABELS[source] ?? source;
}

export function sourceBadgeClass(source?: string | null): string {
  return SOURCE_COLORS[source ?? ""] ?? "bg-gray-100 text-gray-500";
}

export function formatRelativeContact(lastContact?: string | null): {
  label: string;
  colorClass: string;
} {
  const raw = String(lastContact ?? "").trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený") {
    return { label: "Nikdy", colorClass: "text-xs text-red-500 font-medium" };
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    const days = Math.floor((Date.now() - parsed) / 86_400_000);
    const color =
      days > 14 ? "text-red-500" : days > 7 ? "text-orange-500" : "text-green-600";
    if (days === 0) return { label: "dnes", colorClass: `text-xs ${color}` };
    if (days === 1) return { label: "včera", colorClass: `text-xs ${color}` };
    return { label: `pred ${days} dňami`, colorClass: `text-xs ${color}` };
  }

  return { label: raw, colorClass: "text-xs text-gray-600" };
}
