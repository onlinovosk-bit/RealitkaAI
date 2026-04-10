"use client";

import { useState } from "react";

type Goal = {
  id: string;
  label: string;
};

const goals: Goal[] = [
  { id: "more_leads", label: "Získať viac leadov" },
  { id: "better_overview", label: "Mať prehľad o klientoch" },
  { id: "increase_conversion", label: "Zvýšiť konverzie" },
  { id: "faster_communication", label: "Zrýchliť komunikáciu" },
  { id: "team_management", label: "Lepšie riadiť tím" },
  { id: "automation", label: "Automatizovať procesy" },
];

export default function GoalCards({
  onChange,
}: {
  onChange: (selected: string[]) => void;
}) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleGoal = (goalId: string) => {
    let updated;
    if (selectedGoals.includes(goalId)) {
      updated = selectedGoals.filter((id) => id !== goalId);
    } else {
      updated = [...selectedGoals, goalId];
    }
    setSelectedGoals(updated);
    onChange(updated);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {goals.map((goal) => (
        <div
          key={goal.id}
          onClick={() => toggleGoal(goal.id)}
          className={`p-4 border rounded-xl cursor-pointer transition 
            ${
              selectedGoals.includes(goal.id)
                ? "border-black bg-gray-100"
                : "border-gray-300"
            }`}
        >
          <p className="font-medium">{goal.label}</p>
        </div>
      ))}
    </div>
  );
}
