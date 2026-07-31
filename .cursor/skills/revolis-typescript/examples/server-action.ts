"use server";

/**
 * Reference server action — Revolis CRM patterns.
 * Zod validation, session-scoped agency_id, typed discriminated return.
 * NOT imported by the app; for skill documentation only.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeServerAction } from "@/lib/safe-action";

// ── Input schema ──────────────────────────────────────────────────

const UpdateLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka", "Stratený"]),
});

export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;

// ── Result types ──────────────────────────────────────────────────

export type UpdateLeadStatusResult =
  | { ok: true; data: { leadId: string; status: string } }
  | { ok: false; error: string };

interface ProfileAgencyRow {
  agency_id: string;
  role: string | null;
}

// ── Session helpers ───────────────────────────────────────────────

async function resolveAgencyId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ agencyId: string } | { error: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Nie ste prihlásený." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Profil sa nepodarilo načítať." };
  }

  const row = profile as ProfileAgencyRow;
  return { agencyId: row.agency_id };
}

// ── Action ────────────────────────────────────────────────────────

export async function updateLeadStatus(
  rawInput: UpdateLeadStatusInput
): Promise<UpdateLeadStatusResult> {
  const parsed = UpdateLeadStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Neplatné údaje.";
    return { ok: false, error: firstIssue };
  }

  const { leadId, status } = parsed.data;

  return safeServerAction(async () => {
    const supabase = await createClient();
    const agency = await resolveAgencyId(supabase);

    if ("error" in agency) {
      throw new Error(agency.error);
    }

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId)
      .eq("agency_id", agency.agencyId)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      throw new Error("Aktualizácia leadu zlyhala.");
    }

    if (!updated) {
      throw new Error("Lead nebol nájdený.");
    }

    return {
      leadId: updated.id as string,
      status: updated.status as string,
    };
  }, "Aktualizácia stavu zlyhala.");
}
