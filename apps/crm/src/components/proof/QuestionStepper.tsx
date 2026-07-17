"use client";

import { useCallback, useState } from "react";
import type { ProofReport } from "@/lib/proof/types";
import { computeProofReport } from "@/lib/proof/engine";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import ProgressBar from "./ProgressBar";

export type ProofFormState = {
  agentsCount: string;
  leadsPerMonth: string;
  responseMinutes: string;
  dealRatePercent: string;
  followUpRatePercent: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  city: string;
  gdprConsent: boolean;
};

export const INITIAL_PROOF_FORM: ProofFormState = {
  agentsCount: "5",
  leadsPerMonth: "80",
  responseMinutes: "120",
  dealRatePercent: "8",
  followUpRatePercent: "50",
  name: "",
  email: "",
  company: "",
  phone: "",
  city: "",
  gdprConsent: false,
};

const STEPS = [
  {
    id: "agents",
    title: "Koľko maklérov máte v kancelárii?",
    field: "agentsCount" as const,
    type: "range" as const,
    min: 1,
    max: 50,
  },
  {
    id: "leads",
    title: "Koľko nových dopytov mesačne spracujete?",
    field: "leadsPerMonth" as const,
    type: "range" as const,
    min: 10,
    max: 300,
  },
  {
    id: "response",
    title: "Priemerný čas prvej odpovede (minúty)",
    field: "responseMinutes" as const,
    type: "range" as const,
    min: 5,
    max: 360,
  },
  {
    id: "deal",
    title: "Konverzia dopytov na obchod (%)",
    field: "dealRatePercent" as const,
    type: "range" as const,
    min: 2,
    max: 20,
  },
  {
    id: "followup",
    title: "Koľko % dopytov dostane follow-up do 24 hodín?",
    field: "followUpRatePercent" as const,
    type: "range" as const,
    min: 10,
    max: 100,
  },
  {
    id: "contact",
    title: "Kam pošleme váš odhad?",
    field: null,
    type: "contact" as const,
  },
];

type QuestionStepperProps = {
  onSubmit: (form: ProofFormState) => Promise<void>;
  submitting: boolean;
  error: string | null;
};

export default function QuestionStepper({ onSubmit, submitting, error }: QuestionStepperProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProofFormState>(INITIAL_PROOF_FORM);

  const current = STEPS[step - 1];

  function update<K extends keyof ProofFormState>(key: K, value: ProofFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step < STEPS.length) setStep((s) => s + 1);
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  const inputClass =
    "mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border p-6 sm:p-8"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: SLATE_HORIZON.softBorder,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <ProgressBar step={step} total={STEPS.length} />
      <h2 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
        {current.title}
      </h2>

      {current.type === "range" && current.field && (
        <label className="mt-6 block">
          <span className="text-sm font-medium" style={{ color: SLATE_HORIZON.muted }}>
            Hodnota: {form[current.field]}
          </span>
          <input
            type="range"
            min={current.min}
            max={current.max}
            value={form[current.field]}
            onChange={(e) => update(current.field!, e.target.value)}
            className="mt-3 w-full accent-blue-600"
          />
        </label>
      )}

      {current.type === "contact" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Meno a priezvisko *</span>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
              style={{ borderColor: SLATE_HORIZON.line }}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Názov RK *</span>
            <input
              required
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              className={inputClass}
              style={{ borderColor: SLATE_HORIZON.line }}
            />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Email *</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
              style={{ borderColor: SLATE_HORIZON.line }}
            />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Telefón</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
              style={{ borderColor: SLATE_HORIZON.line }}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs" style={{ color: SLATE_HORIZON.muted }}>Mesto</span>
            <input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
              style={{ borderColor: SLATE_HORIZON.line }}
            />
          </label>
          <label className="flex items-start gap-2 sm:col-span-2">
            <input
              type="checkbox"
              required
              checked={form.gdprConsent}
              onChange={(e) => update("gdprConsent", e.target.checked)}
              className="mt-1"
            />
            <span className="text-xs leading-relaxed" style={{ color: SLATE_HORIZON.muted }}>
              Súhlasím so spracovaním údajov za účelom kontaktu a zaslania odhadu (GDPR).
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm" style={{ color: SLATE_HORIZON.danger }}>
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.ink }}
          >
            Späť
          </button>
        )}
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={next}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white"
            style={{ background: SLATE_HORIZON.brandDeep }}
          >
            Ďalej
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting || !form.gdprConsent}
            className="rounded-full px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: SLATE_HORIZON.ctaGradient }}
          >
            {submitting ? "Počítam…" : "Zobraziť odhad"}
          </button>
        )}
      </div>
    </form>
  );
}

export function useProofSubmit() {
  const [phase, setPhase] = useState<"questions" | "loading" | "report">("questions");
  const [report, setReport] = useState<ProofReport | null>(null);
  const [leadCaptureWarning, setLeadCaptureWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (form: ProofFormState) => {
    setSubmitting(true);
    setError(null);
    setLeadCaptureWarning(null);

    const payload = {
      agentsCount: Number(form.agentsCount),
      leadsPerMonth: Number(form.leadsPerMonth),
      responseMinutes: Number(form.responseMinutes),
      dealRatePercent: Number(form.dealRatePercent),
      followUpRatePercent: Number(form.followUpRatePercent),
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      gdprConsent: form.gdprConsent as true,
    };

    let localReport: ProofReport;
    try {
      localReport = computeProofReport(payload);
    } catch {
      setError("Skontrolujte prosím vyplnené hodnoty a skúste znova.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        errors?: Record<string, string[]>;
        report?: ProofReport;
      };

      if (res.ok && data.ok && data.report) {
        setReport(data.report);
      } else {
        setReport(localReport);
        const validationMsg = data.errors
          ? Object.values(data.errors).flat().join(" ")
          : null;
        const msg =
          data.error ||
          validationMsg ||
          (res.status === 401
            ? "Kontakt sa nepodarilo uložiť (session). Odhad zobrazujeme lokálne."
            : "Kontakt sa nepodarilo uložiť. Odhad zobrazujeme z vašich odpovedí.");
        setLeadCaptureWarning(msg);
      }
      setPhase("loading");
    } catch {
      setReport(localReport);
      setLeadCaptureWarning(
        "Kontakt sa nepodarilo uložiť (sieť). Odhad zobrazujeme z vašich odpovedí.",
      );
      setPhase("loading");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const finishLoading = useCallback(() => setPhase("report"), []);

  return { phase, report, leadCaptureWarning, submitting, error, submit, finishLoading };
}
