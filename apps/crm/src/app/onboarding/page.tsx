"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GoalCards from "@/components/onboarding/GoalCards";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const persistGoals = async (goals: string[]) => {
    try {
      await fetch("/api/onboarding/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals }),
      });
    } catch {
      /* best-effort */
    }
  };

  const handleGoalsChange = async (goals: string[]) => {
    setSelectedGoals(goals);
    await persistGoals(goals);
  };

  const handleContinue = async () => {
    await persistGoals(selectedGoals);
    router.push("/onboarding/step-1-vitaj");
  };

  return (
    <>
      <div className="space-y-8 pb-32">
        <div>
          <h1 className="text-xl font-bold mb-2 text-gray-900">
            Čo chceš dosiahnuť s Revolis?
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Vyber jednu alebo viac možností. Pokračovaním prejdeš na úvodný krok nastavenia účtu.
          </p>
          <GoalCards onChange={handleGoalsChange} />
        </div>

        {/* Záložné CTA v toku stránky (ak niekto nescrolluje k fixnému baru) */}
        <div className="flex flex-col items-stretch gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end lg:hidden">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[52px] w-full rounded-xl bg-cyan-500 px-8 py-3 text-center text-base font-bold text-slate-950 shadow-md transition hover:bg-cyan-400"
          >
            Pokračovať
          </button>
        </div>
      </div>

      {/* Vždy viditeľný pás: fixné dno obrazovky (main má overflow-y-auto — bežné CTA končilo mimo výrezu) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-cyan-500/40 bg-slate-950/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md lg:left-56"
        role="region"
        aria-label="Ďalší krok onboardingu"
      >
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
          <p className="hidden text-sm text-slate-400 sm:block">Ďalší krok: úvodné údaje účtu</p>
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[52px] w-full shrink-0 rounded-xl bg-cyan-500 px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400 sm:max-w-xs sm:min-w-[200px]"
          >
            Pokračovať
          </button>
        </div>
      </div>
    </>
  );
}
