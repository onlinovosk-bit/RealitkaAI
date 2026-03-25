"use client";

import { type AssignmentRule } from "@/lib/lead-automation-store";
import { type Profile } from "@/lib/team-store";

const ruleTypeLabels: Record<AssignmentRule["ruleType"], string> = {
  location: "Podľa Lokácie",
  budget: "Podľa Rozpočtu",
  propertyType: "Podľa Typu",
  roundRobin: "Striedavo",
  leastLoaded: "Najmenej Zaťažený",
};

export default function AssignmentRulesTable({
  rules,
  profiles,
  onToggle,
  onDelete,
}: {
  rules: AssignmentRule[];
  profiles: Profile[];
  onToggle: (ruleId: string, active: boolean) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
}) {
  const profileMap = new Map(profiles.map((p) => [p.id, p.fullName]));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Pravidlá Priraďovania</h2>
        <p className="text-sm text-gray-500">
          {rules.length} pravidiel na automatické priraďovanie leadov
        </p>
      </div>

      {rules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Názov</th>
                <th className="px-5 py-3 font-medium">Typ</th>
                <th className="px-5 py-3 font-medium">Agenti</th>
                <th className="px-5 py-3 font-medium">Kritériá</th>
                <th className="px-5 py-3 font-medium">Stav</th>
                <th className="px-5 py-3 font-medium">Akcie</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-5 py-4 text-gray-700">{ruleTypeLabels[rule.ruleType]}</td>
                  <td className="px-5 py-4 text-gray-700">
                    <div className="space-y-1">
                      {rule.profileIds.slice(0, 2).map((id) => (
                        <div key={id} className="text-xs">
                          {profileMap.get(id)}
                        </div>
                      ))}
                      {rule.profileIds.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{rule.profileIds.length - 2} ďalších
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    {rule.criteria?.locations && (
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Lokácia: {rule.criteria.locations.join(", ")}
                      </span>
                    )}
                    {rule.criteria?.propertyTypes && (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Typ: {rule.criteria.propertyTypes.join(", ")}
                      </span>
                    )}
                    {rule.criteria?.minBudget || rule.criteria?.maxBudget ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        Rozpočet: {rule.criteria.minBudget || 0}€ - {rule.criteria.maxBudget || "∞"}€
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onToggle(rule.id, rule.active)}
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        rule.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rule.active ? "Aktívne" : "Neaktívne"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-700">
                    <button
                      onClick={() => onDelete(rule.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Vymazať
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">Zatiaľ nie sú žiadne pravidlá</p>
        </div>
      )}
    </div>
  );
}
