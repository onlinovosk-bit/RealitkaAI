import { createHash, randomUUID } from "crypto";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AiGenerationRow = {
  id: string;
  agency_id: string;
  profile_id: string | null;
  workflow_type: string;
  input_json: Record<string, unknown>;
  idempotency_key: string | null;
  model_output: Record<string, unknown> | null;
  rendered_output: Record<string, unknown> | null;
  prompt_version: string | null;
  prompt_hash: string | null;
  schema_version: string | null;
  model: string | null;
  generation_status: string;
  credits_spent: number | null;
  selected_variant: string | null;
  edited_text: string | null;
  published_to: string[] | null;
  copied_at: string | null;
  rating: number | null;
};

export function listingCreditIdempotencyKey(clientKey: string): string {
  return `listing_gen:${clientKey}`;
}

/** Klientsky UUID — kryptograficky bezpečný, jeden na jedno generovanie. */
export function isValidClientIdempotencyKey(key: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
}

export async function findGenerationByIdempotencyKey(
  key: string,
): Promise<AiGenerationRow | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from("ai_generations")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  return (data as AiGenerationRow | null) ?? null;
}

export async function insertGeneration(row: {
  agencyId: string;
  profileId: string | null;
  workflowType: string;
  inputJson: Record<string, unknown>;
  idempotencyKey: string;
  promptVersion: string;
  promptHash: string;
  schemaVersion: string;
}): Promise<{ id: string } | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("ai_generations")
    .insert({
      agency_id: row.agencyId,
      profile_id: row.profileId,
      workflow_type: row.workflowType,
      input_json: row.inputJson,
      idempotency_key: row.idempotencyKey,
      prompt_version: row.promptVersion,
      prompt_hash: row.promptHash,
      schema_version: row.schemaVersion,
      generation_status: "draft",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return data as { id: string };
}

export async function completeGeneration(row: {
  id: string;
  modelOutput: Record<string, unknown>;
  model: string;
  creditsSpent: number;
}): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;
  await sb
    .from("ai_generations")
    .update({
      model_output: row.modelOutput,
      rendered_output: row.modelOutput,
      model: row.model,
      credits_spent: row.creditsSpent,
      generation_status: "generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
}

export async function updateGenerationStatus(
  id: string,
  agencyId: string,
  patch: Partial<{
    generation_status: string;
    edited_text: string;
    selected_variant: string;
    published_to: string[];
    copied_at: string;
    rating: number;
  }>,
): Promise<boolean> {
  const sb = createServiceRoleClient();
  if (!sb) return false;
  const { error } = await sb
    .from("ai_generations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agency_id", agencyId);
  return !error;
}

export async function getAgencyCreditsBalance(agencyId: string): Promise<number | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from("agencies")
    .select("credits_balance")
    .eq("id", agencyId)
    .maybeSingle();
  return data?.credits_balance ?? null;
}

/** Fallback server-side key ak klient nepošle UUID (testy). */
export function newClientIdempotencyKey(): string {
  return randomUUID();
}

export function inputFingerprint(input: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(input), "utf8")
    .digest("hex")
    .slice(0, 16);
}
