import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Prístup zamietnutý</h1>
        <p className="mt-3 text-gray-600">
          Nemáš oprávnenie na zobrazenie tejto stránky.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Späť na dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Prihlásenie
          </Link>
        </div>
      </div>
    </main>
  );
}
