"use client";

import { useState } from "react";
import { type AssignmentRule } from "@/lib/lead-automation-store";
import { type Profile } from "@/lib/team-store";

const propertyTypes = ["Byt", "Dom", "Pozemok", "Komerčný priestor"];
const locations = ["Bratislava", "Košice", "Banská Bystrica", "Prešov", "Trenčín"];
const budgetRanges = [
  { label: "Do 50 000€", min: 0, max: 50000 },
  { label: "50 000€ - 150 000€", min: 50000, max: 150000 },
  { label: "150 000€ - 500 000€", min: 150000, max: 500000 },
  { label: "Nad 500 000€", min: 500000, max: Infinity },
];

export default function AssignmentRuleForm({
  profiles,
  onSubmit,
  isSaving,
  onCancel,
}: {
  profiles: Profile[];
  onSubmit: (input: {
    name: string;
    ruleType: AssignmentRule["ruleType"];
    profileIds: string[];
    criteria?: AssignmentRule["criteria"];
  }) => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const [ruleType, setRuleType] = useState<AssignmentRule["ruleType"]>("location");
  const [name, setName] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<{ min?: number; max?: number }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const criteria: AssignmentRule["criteria"] = {};
    if (selectedLocations.length > 0) criteria.locations = selectedLocations;
    if (selectedPropertyTypes.length > 0) criteria.propertyTypes = selectedPropertyTypes;
    if (budgetRange.min !== undefined || budgetRange.max !== undefined) {
      criteria.minBudget = budgetRange.min;
      criteria.maxBudget = budgetRange.max;
    }

    await onSubmit({
      name: name || `Pravidlo ${ruleType}`,
      ruleType,
      profileIds: selectedProfiles,
      criteria: Object.keys(criteria).length > 0 ? criteria : undefined,
    });

    // Reset form
    setName("");
    setSelectedProfiles([]);
    setSelectedLocations([]);
    setSelectedPropertyTypes([]);
    setBudgetRange({});
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Typ Pravidla</label>
        <select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as AssignmentRule["ruleType"])}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="location">Podľa Lokácie</option>
          <option value="budget">Podľa Rozpočtu</option>
          <option value="propertyType">Podľa Typu Nehnuteľnosti</option>
          <option value="leastLoaded">Najmenej Zaťažený</option>
          <option value="roundRobin">Striedavo</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Názov Pravidla</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="napr. Bratislava - Lucia"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
      </div>

      {ruleType === "location" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Lokácie</label>
          <div className="space-y-2">
            {locations.map((loc) => (
              <label key={loc} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(loc)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLocations((prev) => [...prev, loc]);
                    } else {
                      setSelectedLocations((prev) => prev.filter((l) => l !== loc));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{loc}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {ruleType === "propertyType" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Typy Nehnuteľností</label>
          <div className="space-y-2">
            {propertyTypes.map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedPropertyTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPropertyTypes((prev) => [...prev, type]);
                    } else {
                      setSelectedPropertyTypes((prev) => prev.filter((t) => t !== type));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {ruleType === "budget" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Rozsah Rozpočtu</label>
          <select
            onChange={(e) => {
              const range = budgetRanges.find((r) => r.label === e.target.value);
              if (range) {
                setBudgetRange({
                  min: range.min,
                  max: range.max === Infinity ? undefined : range.max,
                });
              }
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
          >
            <option value="">Vyber rozsah</option>
            {budgetRanges.map((range) => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Priradiť Agentom</label>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <label key={profile.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedProfiles.includes(profile.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProfiles((prev) => [...prev, profile.id]);
                  } else {
                    setSelectedProfiles((prev) => prev.filter((id) => id !== profile.id));
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{profile.fullName}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={isSaving || selectedProfiles.length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {isSaving ? "Ukladám..." : "Vytvoriť Pravidlo"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Zrušiť
        </button>
      </div>
    </form>
  );
}
