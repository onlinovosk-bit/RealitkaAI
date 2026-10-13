import Link from "next/link";
import { register } from "./actions";
import { isSelfServeSignupEnabled, SELF_SERVE_DEMO_CALENDLY_URL } from "@/lib/signup/self-serve";
import { LANDING_FOCUS_RING, LANDING_INPUT_FOCUS } from "@/lib/landing-a11y";

type RegisterParams = { error?: string; email?: string; sent?: string; plan?: string };

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  minLength,
  maxLength,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-teal-900">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        minLength={minLength}
        maxLength={maxLength}
        className={`w-full rounded-xl border border-teal-200 px-4 py-3 text-sm outline-none transition-colors focus:border-teal-500 ${LANDING_INPUT_FOCUS}`}
      />
    </div>
  );
}

function LoginHint() {
  return (
    <p className="mt-6 text-sm text-teal-700/80">
      Už máte účet?{" "}
      <Link href="/login" className={`font-semibold text-teal-900 underline ${LANDING_FOCUS_RING}`}>
        Prihláste sa
      </Link>
    </p>
  );
}

function LegalFooter() {
  return (
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
  );
}

function InviteForm({ params, minPasswordLength }: { params: RegisterParams; minPasswordLength: number }) {
  return (
    <form action={register} className="space-y-4">
      <Field name="fullName" label="Meno a priezvisko" required />
      <Field name="email" label="Email" type="email" required defaultValue={params.email ?? ""} />
      <Field name="phone" label="Telefón" />
      <Field name="password" label="Heslo" type="password" required minLength={minPasswordLength} />
      <button
        type="submit"
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 ${LANDING_FOCUS_RING}`}
        style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)" }}
      >
        Prepojiť pozvánku
      </button>
    </form>
  );
}

/** Čistý pohľad pre testy; page.tsx číta env a searchParams. */
export function RegisterScreen({ selfServe, params }: { selfServe: boolean; params: RegisterParams }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-teal-50/40 to-white px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-teal-200/70 bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.08)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-teal-950">{selfServe ? "Registrácia" : "Skúška nie je otvorená"}</h1>
          <p className="mt-2 text-sm text-teal-700/80">
            {selfServe
              ? "14 dní zadarmo, bez platobnej karty. Po skončení sa skúšobná verzia sama vypne — nič sa neúčtuje automaticky."
              : "Samoobslužná 14-dňová skúška nie je práve otvorená. Nič sa nestratí — dohodnite si ukážku, alebo sa prihláste, ak už účet máte."}
          </p>
        </div>

        {selfServe && params.sent === "1" && (
          <div data-testid="signup-sent" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
            Poslali sme potvrdzovací e-mail{params.email ? ` na ${params.email}` : ""}. Kliknutím na odkaz v ňom dokončíte vytvorenie kancelárie.
          </div>
        )}

        {params.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        {selfServe ? (
          <form action={register} className="space-y-4">
            <input type="hidden" name="plan" value={params.plan ?? ""} />
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
              <label>
                Web
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <Field name="agencyName" label="Názov kancelárie" maxLength={120} />
            <Field name="fullName" label="Meno a priezvisko" required />
            <Field name="email" label="Email" type="email" required defaultValue={params.email ?? ""} />
            <Field name="phone" label="Telefón" />
            <Field name="password" label="Heslo" type="password" required minLength={8} />
            <label className="flex items-start gap-2 text-sm text-teal-900">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>
                Súhlasím s <Link href="/legal/zmluva-o-poskytovani-softverovych-sluzieb" className="underline">podmienkami služby</Link> a{" "}
                <Link href="/legal" className="underline">spracovaním osobných údajov</Link>.
              </span>
            </label>
            <button
              type="submit"
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 ${LANDING_FOCUS_RING}`}
              style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)" }}
            >
              Vytvoriť účet
            </button>
          </form>
        ) : (
          <>
            <a
              href={SELF_SERVE_DEMO_CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`mb-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white ${LANDING_FOCUS_RING}`}
              style={{ background: "linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)" }}
            >
              Dohodnite si ukážku
            </a>
            <details className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 text-sm text-teal-900">
              <summary className="cursor-pointer font-medium">Máte pozvánku do kancelárie?</summary>
              <p className="mt-2 mb-4 text-teal-700/80">
                Ak Vám kancelária poslala pozvánku, prepojte e-mail s účtom. Verejná skúška sa tým nezakladá.
              </p>
              <InviteForm params={params} minPasswordLength={6} />
            </details>
          </>
        )}

        <LoginHint />
        <LegalFooter />
      </div>
    </div>
  );
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; sent?: string; plan?: string }>;
}) {
  const params = await searchParams;
  return <RegisterScreen selfServe={isSelfServeSignupEnabled()} params={params} />;
}
