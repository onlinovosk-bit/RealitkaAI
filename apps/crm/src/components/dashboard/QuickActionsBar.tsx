"use client";
import Link from "next/link";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

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
            ? { background: "linear-gradient(135deg, #22D3EE, #0EA5E9)", color: "#050914" }
            : { background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.12)", color: "#94A3B8" }
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
