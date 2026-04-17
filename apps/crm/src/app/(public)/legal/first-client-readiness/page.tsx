import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "First Client Readiness | Revolis.AI",
  description: "14-dňový launch readiness rámec pred prvým enterprise klientom.",
};

const tracks = [
  {
    name: "Critical (D1–D3)",
    items: ["Trust Center live", "Billing E2E smoke", "Incident communication SOP"],
  },
  {
    name: "High (D4–D7)",
    items: ["Support SLA model", "Data onboarding pack", "Monitoring baseline alerts"],
  },
  {
    name: "Medium (D8–D11)",
    items: ["Deliverability hardening", "Security questionnaire pack", "Sales legal kit"],
  },
  {
    name: "Final (D12–D14)",
    items: ["Legal release rhythm", "Customer success framework", "Go/No-Go sign-off"],
  },
];

export default function FirstClientReadinessPage() {
  return (
    <LegalPageShell
      title="First Client Readiness"
      subtitle="Launch plán zoradený podľa priority, aby bol onboarding prvého klienta bezpečný a škálovateľný."
    >
      <div className="space-y-4 text-sm text-slate-200">
        {tracks.map((track) => (
          <section key={track.name} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <h2 className="text-base font-semibold text-cyan-200">{track.name}</h2>
            <ul className="mt-2 space-y-1 text-slate-300">
              {track.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LegalPageShell>
  );
}
