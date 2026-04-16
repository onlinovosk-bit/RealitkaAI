import Link from "next/link";

type LegalPageShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const legalNavItems = [
  { href: "/legal", label: "Legal Hub" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "VOP / Terms" },
  { href: "/security", label: "Security & Compliance" },
  { href: "/status", label: "Status" },
  { href: "/trust-center", label: "Trust Center" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/support", label: "Support SLA" },
  { href: "/legal/first-client-readiness", label: "Readiness 14D" },
  { href: "/legal/quality-gate", label: "Quality Gate" },
  { href: "/status/incidents", label: "Incident Log" },
  { href: "/legal/changelog", label: "Legal Changelog" },
];

export default function LegalPageShell({ title, subtitle, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Revolis.AI Legal</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {legalNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-cyan-300 hover:text-cyan-200"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">{children}</section>
      </div>
    </main>
  );
}
