"use client"; // client komponent

import { useRouter } from "next/navigation"; // Next router
import { goalToFocusMap } from "@/lib/focus-config"; // import mapovania

export default function CompleteOnboarding({
  selectedGoals,
}: {
  selectedGoals: string[]; // vybrané ciele
}) {
  const router = useRouter(); // router init

  const handleContinue = () => {
    const primaryGoal = selectedGoals[0]; // vezmi prvý cieľ
    const focus = goalToFocusMap[primaryGoal]; // mapuj na focus

    router.push(`/dashboard?focus=${focus}`); // presmerovanie
  };

  return (
    <button
      onClick={handleContinue} // click handler
      className="px-4 py-2 bg-black text-white rounded"
    >
      Pokračovať do dashboardu
    </button>
  );
}
