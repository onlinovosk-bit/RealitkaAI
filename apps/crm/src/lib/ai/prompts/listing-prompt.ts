import { createHash } from "crypto";

import { listingOutputSchemaPromptRef } from "@/lib/ai/schemas/listing-output";

/** Verzia promptu — nemení sa pri každom deployi, len pri zmene inštrukcií. */
export const LISTING_PROMPT_VERSION = "listing_prompt_v2026_07";

const NEGATIVE_WORDS =
  '"krásny", "útulný", "výhodná ponuka", "neváhajte", "investícia", "zhodnotenie"';

export function buildListingSystemPrompt(): string {
  return [
    "SYSTEM: Si špecialista na realitnú inzerciu na slovenskom trhu.",
    "STYLE: Píšeš texty, ktoré predávajú, v slovenčine, pre slovenského čitateľa.",
    "LEGAL: Neuvádzaj tvrdenia o investičnej návratnosti ani budúcom vývoji ceny.",
    "OUTPUT: Vráť JSON podľa ListingOutputSchema (definícia v kóde, nie tu).",
    `NEGATIVE: Zakázané slová: ${NEGATIVE_WORDS}.`,
    "PRAVIDLÁ:",
    "1. Nevymýšľaj údaje — chýbajúce uveď v missing_information.",
    "2. Prvá veta je scéna alebo fakt, nie 'Na predaj ponúkame'.",
    "3. Slabiny obráť na argument alebo priznaj vecne.",
    "4. Žiadne emoji v portal_description; v social max 1.",
    listingOutputSchemaPromptRef(),
  ].join("\n");
}

export function listingPromptHash(): string {
  return createHash("sha256")
    .update(buildListingSystemPrompt(), "utf8")
    .digest("hex")
    .slice(0, 32);
}

export function buildListingUserPrompt(propertyBlock: string): string {
  return `NEHNUTEĽNOSŤ:\n${propertyBlock}\n\nVygeneruj JSON podľa ListingOutputSchema. Iba JSON, bez markdown.`;
}
