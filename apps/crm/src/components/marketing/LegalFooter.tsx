import Link from "next/link";

const LINKS = [
  { label: "SaaS zmluva", href: "/legal/zmluva-o-poskytovani-softverovych-sluzieb" },
  { label: "Podmienky", href: "/terms" },
  { label: "Ochrana údajov", href: "/privacy" },
  { label: "Cookies", href: "/cookies" },
  { label: "Pravidlá", href: "/aup" },
  { label: "SLA", href: "/sla" },
  { label: "Bezpečnosť", href: "/security" },
  { label: "Trust Center", href: "/trust-center" },
  { label: "Legal Changelog", href: "/legal/changelog" },
];

const YEAR = new Date().getFullYear();

export default function LegalFooter() {
  return (
    <footer
      className="border-t py-8 mt-16"
      style={{ borderColor: "#112240", background: "#050914" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs"
          style={{ color: "#475569" }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-cyan-400"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: "#334155" }}>
          © {YEAR} ONLINOVO, s. r. o. · IČO: 54166942 ·{" "}
          <a href="tel:+421948444014" className="transition-colors hover:text-cyan-400">
            +421 948 444 014
          </a>{" "}
          ·{" "}
          <a
            href="mailto:legal@revolis.ai"
            className="transition-colors hover:text-cyan-400"
          >
            legal@revolis.ai
          </a>
        </p>
        <p className="mt-2 text-center text-[10px]" style={{ color: "#475569" }}>
          Revolis.AI využíva technológiu Asistent AI. Všetky predikcie majú informatívny charakter.
        </p>
      </div>
    </footer>
  );
}
