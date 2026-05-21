import Link from "next/link";
import { register } from "./actions";
import { LANDING_FOCUS_RING, LANDING_INPUT_FOCUS } from "@/lib/landing-a11y";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-teal-50/40 to-white px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-teal-200/70 bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.08)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-teal-950">Registrácia</h1>
          <p className="mt-2 text-sm text-teal-700/80">
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
            <label className="mb-1 block text-sm font-medium text-teal-900">Meno a priezvisko</label>
            <input
              name="fullName"
              required
              className={`w-full rounded-xl border border-teal-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-teal-900">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={params.email ?? ""}
              required
              className={`w-full rounded-xl border border-teal-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-teal-900">Telefón</label>
            <input
              name="phone"
              className={`w-full rounded-xl border border-teal-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-teal-900">Heslo</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className={`w-full rounded-xl border border-teal-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
            />
          </div>

          <button
            type="submit"
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 ${LANDING_FOCUS_RING}`}
            style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)" }}
          >
            Vytvoriť účet
          </button>
        </form>

        <p className="mt-6 text-sm text-teal-700/80">
          Už máš účet?{" "}
          <Link href="/login" className={`font-semibold text-teal-900 underline ${LANDING_FOCUS_RING}`}>
            Prihlás sa
          </Link>
        </p>
        <p className="mt-4 text-xs text-teal-700/70">
          Pokračovaním súhlasíte s{" "}
          <Link href="/terms" className="underline text-teal-800">
            VOP
          </Link>{" "}
          a beriete na vedomie{" "}
          <Link href="/privacy-policy" className="underline text-teal-800">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/cookie-policy" className="underline text-teal-800">
            Cookie Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
