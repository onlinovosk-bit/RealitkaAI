import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Release Quality Gate | Revolis.AI",
  description: "D1 baseline quality gate pre produkčné release rozhodnutie (Go/No-Go).",
};

const checklist = [
  "Test gate: lint + API validation + smoke + build/deploy gate.",
  "Monitoring gate: 5xx alerts, billing alerts, legal/support API alerts, uptime checks.",
  "Rollback gate: posledný stabilný deploy + verifikačný postup + comms template.",
  "Ownership gate: Product, CTO, Legal, Support, CEO sign-off.",
];

const envList = [
  "EMAIL_PROVIDER (RESEND | BREVO | SMTP)",
  "RESEND_API_KEY / BREVO_API_KEY / SMTP_* podľa provideru",
  "LEGAL_INBOX, SUPPORT_INBOX, LEGAL_FROM_EMAIL, SUPPORT_FROM_EMAIL",
  "LEGAL_WEBHOOK_URL, SUPPORT_WEBHOOK_URL, OPERATIONS_WEBHOOK_URL",
  "NEXT_PUBLIC_APP_URL, Supabase keys, Stripe keys a price IDs",
];

const testPlan = [
  "T1: API validation pre /api/legal/dpa-request a /api/support/request",
  "T2: Public URL smoke (/legal, /status, /trust-center, /support, ...)",
  "T3: UX sanity (form render/submit + cookie banner)",
  "T4: Deploy sanity + post-deploy URL verifikácia",
];

export default function QualityGatePage() {
  return (
    <LegalPageShell title="Release Quality Gate (D1)" subtitle="High-level quality baseline pred oslovením prvého klienta.">
      <div className="space-y-5 text-sm text-slate-200">
        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Go/No-Go checklist</h2>
          <ul className="mt-2 space-y-1 text-slate-300">
            {checklist.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Exact ENV list</h2>
          <ul className="mt-2 space-y-1 text-slate-300">
            {envList.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Test plan</h2>
          <ul className="mt-2 space-y-1 text-slate-300">
            {testPlan.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <h2 className="text-base font-semibold text-amber-200">Rollback</h2>
          <p className="mt-1 text-slate-300">
            Pri kritickej regresii: okamžitý návrat na posledný stabilný deploy, následná verifikácia kritických URL a
            API health, plus status update do 60 minút.
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
