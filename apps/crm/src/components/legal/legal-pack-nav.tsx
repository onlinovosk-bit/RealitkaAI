import Link from "next/link";

export const legalPackLinks = [
  { href: "/privacy-policy", label: "Privacy Policy", anchor: "#privacy-core" },
  { href: "/legal/dpa", label: "DPA (GDPR)", anchor: "#dpa" },
  { href: "/legal/msa", label: "MSA", anchor: "#msa" },
  { href: "/legal/sla", label: "SLA", anchor: "#sla" },
  { href: "/legal/indemnification", label: "Odškodnenie", anchor: "#indemnification" },
  { href: "/legal/enterprise-vop", label: "VOP (doplnok MSA)", anchor: "#vop" },
  { href: "/legal/enterprise-faq", label: "Enterprise FAQ", anchor: "#faq" },
  { href: "/legal/readiness-checklist", label: "Readiness checklist", anchor: "#checklist" },
] as const;

export default function LegalPackNav({ variant = "sticky" }: { variant?: "sticky" | "inline" }) {
  const wrap =
    variant === "sticky"
      ? "sticky top-16 z-10 -mx-1 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur-md sm:px-4"
      : "rounded-xl border border-white/10 bg-slate-950/50 px-3 py-3 sm:px-4";

  return (
    <nav aria-label="Právny balík — navigácia" className={wrap}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Právny balík Revolis.AI</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
        {legalPackLinks.map((item) => (
          <li key={item.href}>
            <Link
              href={`${item.href}${item.anchor}`}
              className="text-cyan-400/95 underline-offset-2 transition hover:text-cyan-300 hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
