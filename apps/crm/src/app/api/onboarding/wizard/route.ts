import { errorResponse, okResponse } from "@/lib/api-response";
import { getActivationFeatureFlags } from "@/lib/activation/flags";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  advanceWizardState,
  completeWizardState,
  extractWizardFromChecklist,
  mergeWizardIntoChecklist,
  normalizeWizardState,
  skipWizardState,
  slugifyAgencyName,
  type WizardOfficeProfile,
  type WizardState,
} from "@/lib/onboarding-wizard";
import { normalizeChecklist } from "@/lib/onboarding-mvp";

export const dynamic = "force-dynamic";

type WizardAction = "save-office" | "advance" | "skip" | "complete";

async function loadContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, agency_id, full_name, email")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Profil sa nenašiel." as const };
  }

  let agency: { id: string; name: string; city: string | null; phone: string | null } | null = null;
  if (profile.agency_id) {
    const { data } = await supabase
      .from("agencies")
      .select("id, name, city, phone")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agency = data ?? null;
  }

  return { profile, agency };
}

async function loadWizardState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  company: string,
  contactEmail: string,
): Promise<WizardState> {
  const { data } = await supabase
    .from("client_onboarding_progress")
    .select("checklist")
    .ilike("company", company)
    .ilike("contact_email", contactEmail)
    .maybeSingle();

  if (data?.checklist && typeof data.checklist === "object") {
    return extractWizardFromChecklist(data.checklist as Record<string, unknown>);
  }

  return normalizeWizardState(null);
}

async function persistWizardState(
  company: string,
  contactEmail: string,
  contactName: string,
  checklistBase: Record<string, unknown>,
  wizard: WizardState,
) {
  const service = createServiceRoleClient();
  if (!service) return { error: "Service role nie je nakonfigurovaný." as const };

  const normalized = normalizeChecklist(checklistBase as never);
  const mergedChecklist = mergeWizardIntoChecklist(
    normalized as unknown as Record<string, boolean | number | undefined>,
    wizard,
  );

  const { data, error } = await service
    .from("client_onboarding_progress")
    .upsert(
      {
        company,
        contact_email: contactEmail.toLowerCase(),
        contact_name: contactName || null,
        checklist: mergedChecklist,
        last_activity_at: new Date().toISOString(),
      },
      { onConflict: "company,contact_email" },
    )
    .select("checklist")
    .single();

  if (error) return { error: error.message as string };
  return {
    state: extractWizardFromChecklist((data.checklist as Record<string, unknown>) ?? {}),
  };
}

export async function GET() {
  const flags = getActivationFeatureFlags();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Unauthorized", 401);

  const ctx = await loadContext(supabase, user.id);
  if ("error" in ctx) return errorResponse(ctx.error, 404);

  const contactEmail = (ctx.profile.email ?? user.email ?? "").trim().toLowerCase();
  const company = ctx.agency?.name?.trim() ?? "";

  const state =
    company && contactEmail
      ? await loadWizardState(supabase, company, contactEmail)
      : normalizeWizardState(null);

  return okResponse({
    enabled: flags.onboardingWizardEnabled,
    state,
    agency: ctx.agency,
    profile: {
      fullName: ctx.profile.full_name,
      role: ctx.profile.role,
    },
  });
}

export async function POST(request: Request) {
  const flags = getActivationFeatureFlags();
  if (!flags.onboardingWizardEnabled) {
    return errorResponse("Onboarding wizard nie je zapnutý.", 403);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = (await request.json()) as {
    action?: WizardAction;
    office?: Partial<WizardOfficeProfile>;
  };

  const action = body.action;
  if (!action) return errorResponse("action je povinný.", 400);

  const ctx = await loadContext(supabase, user.id);
  if ("error" in ctx) return errorResponse(ctx.error, 404);

  if (ctx.profile.role !== "owner" && ctx.profile.role !== "founder") {
    return errorResponse("Wizard je dostupný len pre majiteľa agentúry.", 403);
  }

  const contactEmail = (ctx.profile.email ?? user.email ?? "").trim().toLowerCase();
  const contactName = ctx.profile.full_name ?? "";

  let agencyId = ctx.agency?.id ?? ctx.profile.agency_id;
  let company = ctx.agency?.name?.trim() ?? "";

  if (action === "save-office") {
    const agencyName = (body.office?.agencyName ?? "").trim();
    const city = (body.office?.city ?? "").trim();
    const phone = (body.office?.phone ?? "").trim();

    if (!agencyName) return errorResponse("Názov kancelárie je povinný.", 400);

    if (agencyId) {
      const { error } = await supabase
        .from("agencies")
        .update({
          name: agencyName,
          city: city || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agencyId);

      if (error) return errorResponse(error.message, 500);
    } else {
      const service = createServiceRoleClient();
      if (!service) return errorResponse("Service role nie je nakonfigurovaný.", 500);

      const slug = slugifyAgencyName(agencyName) || `agency-${Date.now()}`;
      const { data: created, error } = await service
        .from("agencies")
        .insert({
          name: agencyName,
          slug,
          city: city || "",
          phone: phone || null,
          country: "Slovensko",
        })
        .select("id, name")
        .single();

      if (error || !created) return errorResponse(error?.message ?? "Agentúra sa nepodarila vytvoriť.", 500);

      agencyId = created.id;
      company = created.name;
      await service.from("profiles").update({ agency_id: agencyId }).eq("id", ctx.profile.id);
    }

    company = agencyName;
  }

  if (!company || !contactEmail) {
    return errorResponse("Chýba agentúra alebo email — dokončite profil kancelárie.", 400);
  }

  const current = await loadWizardState(supabase, company, contactEmail);

  let nextState = current;
  if (action === "save-office") {
    nextState = advanceWizardState({ ...current, wizardStep: 1 });
  } else if (action === "advance") {
    nextState = advanceWizardState(current);
  } else if (action === "skip") {
    nextState = skipWizardState(current);
  } else if (action === "complete") {
    nextState = completeWizardState(current);
  }

  const saved = await persistWizardState(company, contactEmail, contactName, {}, nextState);
  if ("error" in saved) return errorResponse(saved.error, 500);

  return okResponse({
    state: saved.state,
    redirectTo: saved.state.wizardCompleted || saved.state.wizardSkipped ? "/dashboard" : undefined,
  });
}
