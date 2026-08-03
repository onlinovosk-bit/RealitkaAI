import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListingContent } from "@/lib/ai/listing-content";
import type { ListingVariants } from "@/lib/ai/listing-variants";
import { getAdminClient } from "./valuation-db";

export async function getAgencyIdForTestUser(email: string): Promise<string> {
  const admin = getAdminClient();
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  const authUser = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) throw new Error(`Test user not found in auth: ${email}`);

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (profErr) throw new Error(`profiles: ${profErr.message}`);
  if (!profile?.agency_id) throw new Error(`Missing agency_id for ${email}`);

  return profile.agency_id as string;
}

export async function seedDraftGeneration(input: {
  id: string;
  agencyId: string;
  content: ListingContent;
  variants: ListingVariants;
}): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("ai_generations").insert({
    id: input.id,
    agency_id: input.agencyId,
    kind: "listing_content",
    persona: "GENERAL",
    input: {
      type: "3-izbovy byt",
      location: "Presov",
      size_m2: 72,
      price: 165000,
      condition: "po rekonstrukcii",
      features: ["balkon"],
    },
    output: input.content,
    variants: input.variants,
    status: "draft",
  });

  if (error) throw new Error(`seed ai_generations: ${error.message}`);
}

export async function deleteGeneration(id: string): Promise<void> {
  const admin = getAdminClient();
  await admin.from("ai_generations").delete().eq("id", id);
}

export async function fetchGenerationRow(
  admin: SupabaseClient,
  id: string,
): Promise<{ edited_output: ListingContent | null; chosen_variants: Record<string, string> | null }> {
  const { data, error } = await admin
    .from("ai_generations")
    .select("edited_output, chosen_variants")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`fetch generation: ${error.message}`);
  if (!data) throw new Error(`generation row missing: ${id}`);
  return data as { edited_output: ListingContent | null; chosen_variants: Record<string, string> | null };
}

