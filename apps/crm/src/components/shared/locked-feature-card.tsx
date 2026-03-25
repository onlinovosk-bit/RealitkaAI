import Link from "next/link";

export default function LockedFeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
        🔒
      </div>
      <h2 className="mt-4 text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mt-3 text-sm text-gray-500">{description}</p>

      <div className="mt-6">
        <Link
          href="/billing"
          className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Odomknúť funkciu
        </Link>
      </div>
    </div>
  );
}
