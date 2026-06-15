"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import InviteForm from "@/components/team/invite-form";
import {
  WIZARD_PLAYBOOK_LINKS,
  WIZARD_STEPS,
  buildWizardMorningBriefPreview,
  type WizardOfficeProfile,
  type WizardState,
} from "@/lib/onboarding-wizard";

type WizardPayload = {
  enabled: boolean;
  state: WizardState;
  agency: { id: string; name: string; city: string | null; phone: string | null } | null;
  profile: { fullName: string | null; role: string | null };
};

async function postWizard(body: Record<string, unknown>) {
  const res = await fetch("/api/onboarding/wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string; state?: WizardState; redirectTo?: string };
  if (!json.ok) throw new Error(json.error ?? "Uloženie zlyhalo.");
  return json;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex gap-2">
      {WIZARD_STEPS.map((step) => {
        const active = step.step === current;
        const done = step.step < current;
        return (
          <li
            key={step.step}
            className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium ${
              active
                ? "border-cyan-500 bg-cyan-50 text-cyan-900"
                : done
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-gray-200 bg-gray-50 text-gray-500"
            }`}
          >
            {step.step}. {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function MorningBriefPreview({ ownerName }: { ownerName: string }) {
  const brief = buildWizardMorningBriefPreview(ownerName);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Ukážka ranného briefu</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{brief.subjectLine}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{brief.aiText}</p>
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{brief.topLead.name}</p>
        <p className="text-xs text-slate-500">BRI {brief.topLead.score}/100 · {brief.action.verb} pred 10:00</p>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Skutočný brief príde emailom o 8:00 — podľa HOT leadov a aktivity v CRM.
      </p>
    </div>
  );
}

export default function WizardClient({ step }: { step: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<WizardPayload | null>(null);
  const [office, setOffice] = useState<WizardOfficeProfile>({
    agencyName: "",
    city: "",
    phone: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/wizard");
      const json = (await res.json()) as WizardPayload & { ok?: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Načítanie zlyhalo.");
      setPayload(json);
      setOffice({
        agencyName: json.agency?.name ?? "",
        city: json.agency?.city ?? "",
        phone: json.agency?.phone ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Načítanie zlyhalo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const finish = async (action: "advance" | "skip" | "complete" | "save-office") => {
    setSaving(true);
    setError("");
    try {
      const json = await postWizard(
        action === "save-office"
          ? { action, office }
          : { action },
      );
      if (json.redirectTo) {
        router.push(json.redirectTo);
        return;
      }
      const nextStep = json.state?.wizardStep ?? step;
      router.push(`/get-started/${nextStep}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uloženie zlyhalo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Načítavam onboarding…</p>;
  }

  if (!payload?.enabled) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Onboarding wizard nie je momentálne zapnutý.</p>
        <Link href="/dashboard" className="text-sm font-medium text-cyan-700 hover:underline">
          Prejsť do CRM →
        </Link>
      </div>
    );
  }

  const ownerName = payload.profile.fullName ?? "Maklér";

  return (
    <div className="mx-auto max-w-2xl">
      <StepIndicator current={step} />
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {step === 1 ? (
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profil kancelárie</h1>
            <p className="mt-1 text-sm text-gray-500">Základné údaje pre tím a ranný report.</p>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Názov agentúry *</label>
              <input
                required
                value={office.agencyName}
                onChange={(e) => setOffice((o) => ({ ...o, agencyName: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
                placeholder="RK z Prešova"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mesto</label>
              <input
                value={office.city}
                onChange={(e) => setOffice((o) => ({ ...o, city: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
                placeholder="Prešov"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefón kancelárie</label>
              <input
                value={office.phone}
                onChange={(e) => setOffice((o) => ({ ...o, phone: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-cyan-500"
                placeholder="+421 ..."
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import kontaktov</h1>
            <p className="mt-1 text-sm text-gray-500">
              Presuň existujúce dáta do Revolis — odporúčame začať univerzálnym importom.
            </p>
          </div>
          <div className="space-y-3">
            {WIZARD_PLAYBOOK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-cyan-400"
              >
                <p className="font-semibold text-gray-900">{link.title}</p>
                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ranný report & pozvánky</h1>
            <p className="mt-1 text-sm text-gray-500">
              Náhľad denného briefu a pozvanie kolegov do CRM.
            </p>
          </div>
          <MorningBriefPreview ownerName={ownerName} />
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Pozvať kolegu</h2>
            <InviteForm />
          </div>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          disabled={saving || step <= 1}
          onClick={() => router.push(`/get-started/${step - 1}`)}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-40"
        >
          Späť
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void finish("skip")}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600"
          >
            Preskočiť
          </button>
          {step === 1 ? (
            <button
              type="button"
              disabled={saving || !office.agencyName.trim()}
              onClick={() => void finish("save-office")}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              Uložiť a pokračovať
            </button>
          ) : step === 3 ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void finish("complete")}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              Dokončiť setup
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void finish("advance")}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              Pokračovať
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
