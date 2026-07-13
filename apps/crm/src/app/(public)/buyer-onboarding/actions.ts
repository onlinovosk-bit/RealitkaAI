"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { createTask } from "@/lib/tasks-store";
import { notifyNewBuyerLead } from "@/lib/notify-new-lead";
import { rescoreLead } from "@/lib/rescore-lead";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";
import {
  computeBuyerReadinessScore,
  deriveClientSegment,
  mapIntentPropertyTypeToSk,
  type BuyerIntentInput,
  type DealType,
  type PropertyType,
  type TimeHorizon,
} from "@/lib/buyer-intent";

const SEGMENT_LABEL: Record<string, string> = {
  first_time_buyer: "Prvý kupujúci",
  investor:         "Investor",
  relocator:        "Presťahovalec",
  renter:           "Nájomca",
  seller:           "Predávajúci",
  other:            "Iný",
};

function resolveBuyerOnboardingAgencyId(): string {
  return process.env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() || SMOLKO_AGENCY_ID;
}

export async function submitBuyerOnboarding(formData: FormData) {
  const admin = createAdminClient();
  const agencyId = resolveBuyerOnboardingAgencyId();

  // ── 1. Parse + validate form input ────────────────────────────────────────
  const name      = String(formData.get("name") ?? "").trim();
  const email     = String(formData.get("email") ?? "").trim();
  const phone     = String(formData.get("phone") ?? "").trim();
  const dealType  = (formData.get("dealType") as DealType)    ?? "buy";
  const propType  = (formData.get("propertyType") as PropertyType) ?? "flat";
  const city      = String(formData.get("primaryCity") ?? "").trim();
  const budgetMin = Number(formData.get("budgetMin") ?? 0);
  const budgetMax = Number(formData.get("budgetMax") ?? 0);
  const horizon   = (formData.get("timeHorizonMonths") as TimeHorizon) ?? "6-12";
  const newBuild  = formData.get("newBuildOnly") === "on";
  const mortgage  = formData.get("needsMortgageHelp") === "on";
  const focusText = String(formData.get("rawFocusText") ?? "").trim();

  if (!name || !email) {
    redirect("/buyer-onboarding?error=missing_fields");
  }

  const intentInput: BuyerIntentInput = {
    dealType,
    propertyType: propType,
    primaryCity: city,
    budgetMin,
    budgetMax,
    timeHorizonMonths: horizon,
    newBuildOnly: newBuild,
    needsMortgageHelp: mortgage,
    rawFocusText: focusText,
  };

  const segment       = deriveClientSegment(intentInput);
  const readinessScore = computeBuyerReadinessScore(intentInput);
  const skPropertyType = mapIntentPropertyTypeToSk(propType);

  // ── 2. Upsert lead (service role — public form has no tenant session) ───────
  let leadId: string | null = null;

  const { data: existing, error: existingError } = await admin
    .from("leads")
    .select("id")
    .eq("email", email)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (existingError) {
    autoErrorCapture(existingError, "buyer-onboarding:lead_lookup");
  }

  if (existing?.id) {
    leadId = existing.id;
    const { error: updateError } = await admin
      .from("leads")
      .update({
        name,
        phone: phone || undefined,
        client_segment: segment,
        buyer_readiness_score: readinessScore,
        location: city || undefined,
        property_type: skPropertyType,
        budget: budgetMax > 0
          ? `${budgetMin.toLocaleString("sk-SK")} – ${budgetMax.toLocaleString("sk-SK")} €`
          : undefined,
        financing: mortgage ? "Hypotéka" : "Hotovosť",
        timeline: horizon === "0-3" ? "Ihneď" : horizon === "3-6" ? "Do 3 mesiacov" : "Do 6 mesiacov",
      })
      .eq("id", leadId);

    if (updateError) {
      autoErrorCapture(updateError, "buyer-onboarding:lead_update");
      leadId = null;
    }
  } else {
    const newLeadId = crypto.randomUUID();
    const { data: newLead, error: insertError } = await admin
      .from("leads")
      .insert({
        id: newLeadId,
        agency_id: agencyId,
        name,
        email,
        phone: phone || "",
        status: "Nový",
        source: "Buyer onboarding",
        score: readinessScore,
        client_segment: segment,
        buyer_readiness_score: readinessScore,
        assigned_agent: "Nepriradený",
        last_contact: "Práve vytvorený",
        note: focusText ? `Fokus: ${focusText}` : "",
        location: city,
        budget: budgetMax > 0 ? `${budgetMin.toLocaleString("sk-SK")} – ${budgetMax.toLocaleString("sk-SK")} €` : "",
        property_type: skPropertyType,
        rooms: "2 izby",
        financing: mortgage ? "Hypotéka" : "Hotovosť",
        timeline: horizon === "0-3" ? "Ihneď" : horizon === "3-6" ? "Do 3 mesiacov" : "Do 6 mesiacov",
      })
      .select("id")
      .single();

    if (insertError) {
      autoErrorCapture(insertError, "buyer-onboarding:lead_insert");
    } else {
      leadId = newLead?.id ?? null;
    }
  }

  // ── 3. Upsert buyer_intent ────────────────────────────────────────────────
  let intentId: string | null = null;

  if (leadId) {
    const { data: intent, error: intentError } = await admin
      .from("buyer_intents")
      .upsert(
        {
          lead_id: leadId,
          deal_type: dealType,
          property_type: propType,
          primary_city: city,
          budget_min: budgetMin,
          budget_max: budgetMax,
          time_horizon_months: horizon,
          new_build_only: newBuild,
          needs_mortgage_help: mortgage,
          raw_focus_text: focusText,
          client_segment: segment,
          buyer_readiness_score: readinessScore,
        },
        { onConflict: "lead_id" },
      )
      .select("id")
      .single();

    if (intentError) {
      autoErrorCapture(intentError, "buyer-onboarding:buyer_intent_upsert");
    } else {
      intentId = intent?.id ?? null;
    }
  }

  // ── 3.5 CRM task pre agenta ───────────────────────────────────────────────
  if (leadId) {
    try {
      const listingUrl = `/nehnutelnosti?property=${propType}${city ? `&city=${encodeURIComponent(city)}` : ""}${budgetMax > 0 ? `&budgetMax=${budgetMax}` : ""}${intentId ? `&intentId=${intentId}` : ""}`;

      const budgetStr = budgetMax > 0
        ? `${budgetMin > 0 ? `${budgetMin.toLocaleString("sk-SK")} – ` : "do "}${budgetMax.toLocaleString("sk-SK")} €`
        : "neurčený";

      await createTask({
        leadId,
        assignedProfileId: null,
        title: `Nový buyer lead: ${name} (${SEGMENT_LABEL[segment] ?? segment})`,
        description: [
          `Segment: ${SEGMENT_LABEL[segment] ?? segment}`,
          `Skóre pripravenosti: ${readinessScore}/100`,
          `Hľadá: ${propType}${city ? ` v ${city}` : ""}, rozpočet: ${budgetStr}`,
          focusText ? `Fokus: "${focusText}"` : "",
          `Ponuky: ${listingUrl}`,
        ].filter(Boolean).join("\n"),
        status: "open",
        priority: readinessScore >= 60 ? "high" : readinessScore >= 30 ? "medium" : "low",
        dueAt: null,
      });
    } catch (taskError) {
      autoErrorCapture(taskError, "buyer-onboarding:crm_task");
    }
  }

  // ── 3.6 Notify + rescore ──────────────────────────────────────────────────
  if (leadId) {
    const budgetStr = budgetMax > 0
      ? `${budgetMin > 0 ? `${budgetMin.toLocaleString("sk-SK")} – ` : "do "}${budgetMax.toLocaleString("sk-SK")} €`
      : "neurčený";

    notifyNewBuyerLead({
      leadName: name,
      leadEmail: email,
      segment: SEGMENT_LABEL[segment] ?? segment,
      readinessScore,
      city,
      budget: budgetStr,
      focusText: focusText || undefined,
      leadUrl: `/leads/${leadId}`,
    }).catch((err) => autoErrorCapture(err, "buyer-onboarding:notify"));

    rescoreLead(leadId).catch((err) => autoErrorCapture(err, "buyer-onboarding:rescore"));
  }

  // ── 4. Build redirect URL → /nehnutelnosti ────────────────────────────────
  const params = new URLSearchParams();
  params.set("dealType", dealType);
  params.set("property", propType);
  if (city)            params.set("city", city);
  if (budgetMin > 0)   params.set("budgetMin", String(budgetMin));
  if (budgetMax > 0)   params.set("budgetMax", String(budgetMax));
  if (intentId)        params.set("intentId", intentId);

  redirect(`/nehnutelnosti?${params.toString()}`);
}
