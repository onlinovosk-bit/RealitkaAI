"use client";
import { usePathname } from "next/navigation";
import { STEPS } from "./config";

export default function OnboardingSidebar() {
  const pathname = usePathname();
  const currentSlug = (pathname ?? "").split("/").pop() ?? "";
  const currentIdx = STEPS.findIndex(s => s.slug === currentSlug);
  const progressPct = currentIdx >= 0 ? Math.round((currentIdx / (STEPS.length - 1)) * 100) : 0;

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-gray-100 p-6 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center text-white font-bold text-base">R</div>
        <span className="font-bold text-sm tracking-tight">Revolis.AI</span>
        <span className="ml-1 text-[9px] border border-gray-300 rounded px-1 text-gray-400 font-medium">BETA</span>
      </div>

      <div className="mb-6 mt-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>POSTUP</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-900 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <nav className="space-y-1">
        {STEPS.map(s => {
          const isActive = s.slug === currentSlug;
          const isDone = s.index < (currentIdx >= 0 ? currentIdx + 1 : 1);
          return (
            <div key={s.slug}
              className={"flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm " +
                (isActive ? "bg-gray-900 text-white font-semibold" :
                 isDone   ? "text-gray-500" : "text-gray-300")}>
              <span className={isActive || isDone ? "" : "grayscale opacity-40"}>{s.emoji}</span>
              <span>{s.label}</span>
              {isDone && <span className="ml-auto text-green-500 text-xs">✓</span>}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 text-[10px] text-gray-400 text-center">
        ~{Math.max(1, (STEPS.length - 1) - currentIdx)} min zostáva
      </div>
    </aside>
  );
}
