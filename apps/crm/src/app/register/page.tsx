import Link from "next/link";
import { register } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Registrácia</h1>
          <p className="mt-2 text-sm text-gray-500">
            Prvý účet sa nastaví ako owner, ďalšie ako agent.
          </p>
        </div>

        {params.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        <form action={register} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Meno a priezvisko</label>
            <input
              name="fullName"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefón</label>
            <input
              name="phone"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Heslo</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Vytvoriť účet
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-500">
          Už máš účet?{" "}
          <Link href="/login" className="font-medium text-gray-900 underline">
            Prihlás sa
          </Link>
        </p>
      </div>
    </main>
  );
}
