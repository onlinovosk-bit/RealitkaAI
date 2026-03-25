"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type AssignmentRule } from "@/lib/lead-automation-store";
import { type Profile } from "@/lib/team-store";
import AssignmentRuleForm from "@/components/automation/assignment-rule-form";
import AssignmentRulesTable from "@/components/automation/assignment-rules-table";

export default function AssignmentRulesPanel({
  initialRules,
  profiles,
}: {
  initialRules: AssignmentRule[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<AssignmentRule[]>(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreateRule(input: {
    name: string;
    ruleType: AssignmentRule["ruleType"];
    profileIds: string[];
    criteria?: AssignmentRule["criteria"];
  }) {
    setIsSaving(true);

    try {
      const response = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Chyba pri vytváraní pravidla");
      }

      setRules((current) => [data.rule, ...current]);
      setShowForm(false);
      alert("Pravidlo bolo úspešne vytvorené");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chyba pri vytváraní pravidla");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleRule(ruleId: string, active: boolean) {
    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Chyba pri aktualizácii pravidla");
      }

      setRules((current) =>
        current.map((rule) =>
          rule.id === ruleId ? { ...rule, active: !active } : rule
        )
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chyba pri aktualizácii pravidla");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Naozaj chceš vymazať toto pravidlo?")) return;

    try {
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Chyba pri vymazávaní pravidla");
      }

      setRules((current) => current.filter((rule) => rule.id !== ruleId));
      alert("Pravidlo bolo úspešne vymazané");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chyba pri vymazávaní pravidla");
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Rule Form */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Nové Pravidlo</h2>
          <AssignmentRuleForm
            profiles={profiles}
            onSubmit={handleCreateRule}
            isSaving={isSaving}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Nové Pravidlo
        </button>
      )}

      {/* Rules Table */}
      <AssignmentRulesTable
        rules={rules}
        profiles={profiles}
        onToggle={handleToggleRule}
        onDelete={handleDeleteRule}
      />
    </div>
  );
}
