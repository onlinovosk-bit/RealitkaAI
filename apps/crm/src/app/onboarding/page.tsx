"use client";

import GoalCards from "@/components/onboarding/GoalCards";
// import GoalCheckboxes from "@/components/onboarding/GoalCheckboxes";

export default function OnboardingPage() {
  // handler pre uloženie
  const handleGoalsChange = async (selectedGoals: string[]) => {
    console.log("Selected goals:", selectedGoals);
    // API call (môžeš upraviť endpoint)
    await fetch("/api/onboarding/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals: selectedGoals }),
    });
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">
        Čo chceš dosiahnuť s Revolis?
      </h1>
      <GoalCards onChange={handleGoalsChange} />
      {/* <GoalCheckboxes onChange={handleGoalsChange} /> */}
    </div>
  );
}
