import Link from "next/link";

export default function FeatureGateBanner({
  title = "Funkcia je obmedzená",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-yellow-800">{title}</h2>
          <p className="mt-1 text-sm text-yellow-700">{description}</p>
        </div>

        <Link
          href="/billing"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Upgrade plánu
        </Link>
      </div>
    </div>
  );
}
