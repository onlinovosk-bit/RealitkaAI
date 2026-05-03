"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { supabaseClient } from "@/lib/supabase/client";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";
import { getNextSlug, getPrevSlug, getStepBySlug } from "./config";
import type { OnboardingChecklist } from "@/lib/onboarding-mvp";

export type OnboardingData = {
  name: string; role: string;
  agencyName: string; city: string;
  phone: string; linkedin: string; bio: string | string[];
  specializations: string[];
  aiName: string; aiTone: string;
  autoReply: boolean; workHours: boolean; leadScoring: boolean;
  importSource: string;
  automation: { welcome: boolean; followUp: boolean; reminder: boolean; score: boolean; birthday: boolean };
  connectedTools: string[];
  primaryGoal: string;
  kpiLeads: number; kpiDays: number; kpiConversion: number;
};

export const DEFAULT_DATA: OnboardingData = {
  name: "", role: "",
  agencyName: "", city: "",
  phone: "", linkedin: "", bio: "",
  specializations: [],
  aiName: AI_ASSISTANT_NAME, aiTone: "💼 PROFESIONÁLNY",
  autoReply: true, workHours: false, leadScoring: true,
  importSource: "",
  automation: { welcome: true, followUp: true, reminder: true, score: true, birthday: false },
  connectedTools: [],
  primaryGoal: "",
  kpiLeads: 30, kpiDays: 45, kpiConversion: 15,
};

async function patchOnboardingChecklist(
  company: string,
  contactEmail: string,
  patch: Partial<OnboardingChecklist>,
  contactName?: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/onboarding/mvp/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, contactEmail, contactName: contactName ?? "", checklist: patch }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { progress?: { id?: string } };
    return json.progress?.id ?? null;
  } catch {
    return null;
  }
}

export function useOnboarding(currentSlug: string) {
  const router = useRouter();
  const [formData, setFormData] = useState<OnboardingData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const formDataRef = useRef<OnboardingData>(DEFAULT_DATA);

  useEffect(() => {
    const savedId = localStorage.getItem("onboarding_session_id");
    if (savedId) sessionIdRef.current = savedId;
    const raw = localStorage.getItem("onboarding_data");
    if (raw) {
      try {
        setFormData((prev) => {
          const merged = { ...prev, ...JSON.parse(raw) };
          formDataRef.current = merged;
          return merged;
        });
      } catch {
        /* ignore */
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  /** Uloží lokálne hneď; Supabase na pozadí — navigácia nesmie čakať na sieť (inak „Pokračovať" nefunguje). */
  const save = (data: OnboardingData) => {
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = uuidv4();
      sessionIdRef.current = sessionId;
      localStorage.setItem("onboarding_session_id", sessionId);
    }
    localStorage.setItem("onboarding_data", JSON.stringify(data));
    localStorage.setItem("onboarding_step", currentSlug);
    const step = getStepBySlug(currentSlug);
    void supabaseClient
      .from("onboarding_sessions")
      .upsert({
        session_id: sessionId,
        step: step?.index ?? 1,
        form_data: data,
        updated_at: new Date().toISOString(),
      })
      .then(
        () => {},
        () => {}
      );
  };

  const update = (fields: Partial<OnboardingData>) =>
    setFormData((prev) => {
      const next = { ...prev, ...fields };
      formDataRef.current = next;
      return next;
    });

  const next = () => {
    save(formDataRef.current);
    const nextSlug = getNextSlug(currentSlug);
    if (nextSlug) router.push(`/onboarding/${nextSlug}`);
  };

  const back = () => {
    const prevSlug = getPrevSlug(currentSlug);
    if (prevSlug) router.push(`/onboarding/${prevSlug}`);
  };

  const skip = () => {
    const nextSlug = getNextSlug(currentSlug);
    if (nextSlug) router.push(`/onboarding/${nextSlug}`);
  };

  const patchChecklist = useCallback(async (patch: Partial<OnboardingChecklist>): Promise<string | null> => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const email = session?.user?.email ?? "";
    const company = formDataRef.current.agencyName;
    const contactName = formDataRef.current.name;
    if (!company || !email) return null;
    return patchOnboardingChecklist(company, email, patch, contactName);
  }, []);

  return { formData, update, next, back, skip, loaded, patchChecklist };
}
