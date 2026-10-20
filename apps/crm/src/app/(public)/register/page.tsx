import Link from "next/link";
import { register } from "./actions";
import { isSelfServeSignupEnabled } from "@/lib/signup/self-serve";
import { AUTH_INPUT_CLASS, AUTH_PAGE } from "@/lib/auth-page-theme";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; sent?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const selfServe = isSelfServeSignupEnabled();

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: AUTH_PAGE.pageBackground }}>
      <div
        className="mx-auto max-w-md rounded-3xl border bg-white p-8"
        style={{ borderColor: AUTH_PAGE.cardBorder, boxShadow: AUTH_PAGE.cardShadow }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: AUTH_PAGE.ink }}>
            Registrácia
          </h1>
          <p className="mt-2 text-sm" style={{ color: AUTH_PAGE.muted }}>
            {selfServe
              ? "14 dní zadarmo, bez platobnej karty. Po skončení sa skúšobná verzia sama vypne — nič sa neúčtuje automaticky."
              : "Prvý účet sa nastaví ako owner, ďalšie ako agent."}
          </p>
        </div>

        {selfServe && params.sent === "1" && (
          <div
            data-testid="signup-sent"
            className="mb-4 rounded-xl border p-3 text-sm"
            style={{
              borderColor: AUTH_PAGE.cardBorder,
              background: AUTH_PAGE.soft,
              color: AUTH_PAGE.ink,
            }}
          >
            Poslali sme potvrdzovací e-mail{params.email ? ` na ${params.email}` : ""}. Kliknutím na odkaz v ňom dokončíte vytvorenie kancelárie.
          </div>
        )}

        {params.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </div>
        )}

        <form action={register} className="space-y-4">
          {selfServe && (
            <>
              <input type="hidden" name="plan" value={params.plan ?? ""} />
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
                <label>
                  Web
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
                  Názov kancelárie
                </label>
                <input
                  name="agencyName"
                  maxLength={120}
                  className={AUTH_INPUT_CLASS}
                  style={{ borderColor: AUTH_PAGE.cardBorder }}
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
              Meno a priezvisko
            </label>
            <input
              name="fullName"
              required
              className={AUTH_INPUT_CLASS}
              style={{ borderColor: AUTH_PAGE.cardBorder }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={params.email ?? ""}
              required
              className={AUTH_INPUT_CLASS}
              style={{ borderColor: AUTH_PAGE.cardBorder }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
              Telefón
            </label>
            <input
              name="phone"
              className={AUTH_INPUT_CLASS}
              style={{ borderColor: AUTH_PAGE.cardBorder }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: AUTH_PAGE.deep }}>
              Heslo
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={selfServe ? 8 : 6}
              className={AUTH_INPUT_CLASS}
              style={{ borderColor: AUTH_PAGE.cardBorder }}
            />
          </div>

          {selfServe && (
            <label className="flex items-start gap-2 text-sm" style={{ color: AUTH_PAGE.ink }}>
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>
                Súhlasím s <Link href="/legal/zmluva-o-poskytovani-softverovych-sluzieb" className="underline">podmienkami služby</Link> a{" "}
                <Link href="/legal" className="underline">spracovaním osobných údajov</Link>.
              </span>
            </label>
          )}

          <button
            type="submit"
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 ${AUTH_PAGE.focusRing}`}
            style={{ background: AUTH_PAGE.buttonBackground }}
          >
            Vytvoriť účet
          </button>
        </form>

        <p className="mt-6 text-sm" style={{ color: AUTH_PAGE.muted }}>
          Už máte účet?{" "}
          <Link href="/login" className={`font-semibold underline ${AUTH_PAGE.focusRing}`} style={{ color: AUTH_PAGE.brandDeep }}>
            Prihláste sa
          </Link>
        </p>
        <p className="mt-4 text-xs" style={{ color: AUTH_PAGE.muted }}>
          Pokračovaním súhlasíte s{" "}
          <Link href="/terms" className="underline" style={{ color: AUTH_PAGE.brand }}>
            VOP
          </Link>{" "}
          a beriete na vedomie{" "}
          <Link href="/privacy-policy" className="underline" style={{ color: AUTH_PAGE.brand }}>
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/cookie-policy" className="underline" style={{ color: AUTH_PAGE.brand }}>
            Cookie Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
