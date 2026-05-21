"use client";
import Link from "next/link";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export default function QuickActionsBar() {
  const actions = [
    { href: "/leads/new", label: "Pridať", primary: true },
    { href: "/playbook", label: "AI Plán", primary: false },
    { href: "/leads?filter=hot", label: "Horúce", primary: false },
    { href: "/pipeline", label: "Pipeline", primary: false },
  ];

  return (
    <div className="mb-4 md:mb-6 grid grid-cols-4 gap-2 md:flex md:flex-wrap md:gap-3">
      {actions.map(({ href, label, primary }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center justify-center rounded-xl px-3 py-2.5 text-xs md:text-sm font-semibold transition-all active:scale-95 min-h-[40px]"
          style={primary
            ? { background: SLATE_HORIZON.ctaGradient, color: "#fff" }
            : { background: "#fff", border: `1px solid ${SLATE_HORIZON.line}`, color: SLATE_HORIZON.deep }
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
