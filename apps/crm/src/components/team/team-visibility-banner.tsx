export default function TeamVisibilityBanner({
  role,
  teamName,
}: {
  role: string;
  teamName: string | null;
}) {
  const label =
    role === "owner"
      ? "Vidíš všetky dáta (Owner)"
      : role === "manager"
      ? `Vidíš dáta svojho tímu${teamName ? `: ${teamName}` : ""}`
      : `Vidíš len svoje dáta${teamName ? ` (${teamName})` : ""}`;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
      <p className="text-sm text-blue-600">Viditeľnosť</p>
      <h2 className="mt-1 text-sm font-semibold text-blue-900">{label}</h2>
    </div>
  );
}
