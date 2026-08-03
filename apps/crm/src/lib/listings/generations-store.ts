import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ListingContent, ListingPersona, PropertyInput } from "@/lib/ai/listing-content";
import type { ListingVariantKey, ListingVariants } from "@/lib/ai/listing-variants";

export type GenerationStatus = "draft" | "edited" | "published" | "discarded";

export type AiGeneration = {
  id: string;
  agencyId: string | null;
  persona: string | null;
  input: PropertyInput;
  output: ListingContent | null;
  editedOutput: ListingContent | null;
  status: GenerationStatus;
  variants: ListingVariants | null;
  /** Mapa pole -> variant. Zaznamenáva, čo si maklér z ktorého variantu vybral. */
  chosenVariants: Partial<Record<keyof ListingContent, ListingVariantKey>> | null;
  primaryVariant: ListingVariantKey | null;
  createdAt: string;
  updatedAt: string;
};

/** Prevažujúci variant — na agregácie „ktorý štýl vyhráva v okrese X". */
export function computePrimaryVariant(
  chosen: Partial<Record<string, ListingVariantKey>> | null | undefined,
): ListingVariantKey | null {
  if (!chosen) return null;
  const tally = new Map<ListingVariantKey, number>();
  for (const v of Object.values(chosen)) {
    if (!v) continue;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  let best: ListingVariantKey | null = null;
  let bestN = 0;
  for (const [v, n] of tally) if (n > bestN) { best = v; bestN = n; }
  return best;
}

function mapRow(r: Record<string, unknown>): AiGeneration {
  return {
    id: String(r.id),
    agencyId: (r.agency_id as string) ?? null,
    persona: (r.persona as string) ?? null,
    input: r.input as PropertyInput,
    output: (r.output as ListingContent) ?? null,
    editedOutput: (r.edited_output as ListingContent) ?? null,
    status: (r.status as GenerationStatus) ?? "draft",
    variants: (r.variants as ListingVariants) ?? null,
    chosenVariants: (r.chosen_variants as AiGeneration["chosenVariants"]) ?? null,
    primaryVariant: (r.primary_variant as ListingVariantKey) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * Uloží vygenerovaný obsah. ZÁMERNE NIKDY NEVYHADZUJE — zápis je moat capture,
 * nie súčasť zákazníckej cesty. Ak zlyhá, generovanie sa maklérovi zobrazí
 * normálne a chyba sa len zaloguje.
 * Viď .cursor/rules/revolis-incidents.mdc — I-03.
 */
export async function saveGeneration(input: {
  agencyId: string | null;
  profileId?: string | null;
  propertyId?: string | null;
  persona: ListingPersona;
  property: PropertyInput;
  content: ListingContent | null;
  variants?: ListingVariants | null;
  model?: string | null;
  latencyMs?: number | null;
  costEur?: number | null;
  creditsSpent?: number | null;
}): Promise<{ ok: boolean; id?: string }> {
  try {
    if (!input.agencyId) return { ok: false };
    const supabase = createServiceRoleClient();
    if (!supabase) return { ok: false };

    const { data, error } = await supabase
      .from("ai_generations")
      .insert({
        agency_id: input.agencyId,
        profile_id: input.profileId ?? null,
        property_id: input.propertyId ?? null,
        kind: "listing_content",
        persona: input.persona,
        input: input.property,
        output: input.content,
        variants: input.variants ?? null,
        model: input.model ?? null,
        latency_ms: input.latencyMs ?? null,
        cost_eur: input.costEur ?? null,
        credits_spent: input.creditsSpent ?? null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[generations-store] save:", error.message);
      return { ok: false };
    }
    return { ok: true, id: data?.id as string };
  } catch (err) {
    console.warn("[generations-store] save unexpected", err);
    return { ok: false };
  }
}

/** Uloží ručnú úpravu makléra. `output` sa NIKDY neprepisuje. */
export async function updateGenerationEdit(input: {
  id: string;
  agencyId: string;
  editedOutput: ListingContent;
  chosenVariants?: Partial<Record<keyof ListingContent, ListingVariantKey>> | null;
  status?: GenerationStatus;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const { error, count } = await supabase
    .from("ai_generations")
    .update(
      {
        edited_output: input.editedOutput,
        chosen_variants: input.chosenVariants ?? null,
        primary_variant: computePrimaryVariant(input.chosenVariants),
        status: input.status ?? "edited",
      },
      { count: "exact" },
    )
    .eq("id", input.id)
    .eq("agency_id", input.agencyId); // tenant guard aj pri service role

  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function listGenerations(input: {
  agencyId: string;
  limit?: number;
}): Promise<AiGeneration[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("agency_id", input.agencyId)
    .neq("status", "discarded")
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 20);
  if (error) {
    console.warn("[generations-store] list:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

/** Zlúči pôvodný a upravený výstup — UI vždy zobrazuje najnovšiu verziu. */
export function effectiveContent(g: AiGeneration): ListingContent | null {
  return g.editedOutput ?? g.output;
}
