"use client";
import Link from "next/link";

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
          className={
            primary
              ? "flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 md:text-sm"
              : "flex min-h-11 items-center justify-center rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-xs font-semibold text-blue-800 shadow-sm shadow-slate-200/60 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:text-sm"
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
