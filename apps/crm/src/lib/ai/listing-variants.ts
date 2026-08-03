/**
 * KF1 — štyri štýlové varianty inzerátu naraz.
 *
 * Persona (INVESTOR/FAMILY/DOWNSIZER/GENERAL) rieši KOMU píšeme.
 * Variant rieši AKO. Bez toho by tri texty zneli rovnako.
 *
 * Prečo štyri naraz a nie jeden: výber makléra je moat signál. Pri jednom texte
 * vieš len či ho upravil. Pri štyroch vieš, ktorý ŠTÝL na jeho trhu vyhráva —
 * a po stovke inzerátov vieš, že v Prešove funguje iný než v Bratislave.
 * To sa nedá skopírovať, lebo konkurencia ten výber nezbiera.
 *
 * Náklad: 4 varianty jedným volaním ≈ 0,064 € oproti 0,0185 € za jeden
 * (input sa neopakuje, násobí sa len output). Pri sadzbe 2 kredity marža 96 %.
 */

import { callClaude, CLAUDE_SONNET, extractJson } from "./claude";
import { estimateClaudeCostEur } from "./llm-usage-cost";
import {
  PERSONA_CONTEXT,
  buildListingUserPrompt,
  type ListingContent,
  type ListingPersona,
  type PropertyInput,
} from "./listing-content";

export const LISTING_VARIANT_KEYS = ["conversion", "facts", "story", "honest"] as const;
export type ListingVariantKey = (typeof LISTING_VARIANT_KEYS)[number];

export type ListingVariantMeta = {
  key: ListingVariantKey;
  label: string;
  /** Jedna veta pre makléra v UI. */
  hint: string;
  /** Kedy tento štýl vyhráva — pomáha maklérovi vybrať. */
  bestFor: string;
};

export const LISTING_VARIANTS: Record<ListingVariantKey, ListingVariantMeta> = {
  conversion: {
    key: "conversion",
    label: "Vysoko konverzný",
    hint: "Hook, benefit, urgencia, silná výzva na akciu.",
    bestFor: "Štandardné byty, rýchly predaj, veľká konkurencia v lokalite.",
  },
  facts: {
    key: "facts",
    label: "Fakty na stôl",
    hint: "Žiadne prídavné mená. Čísla, dispozícia, náklady, právny stav.",
    bestFor: "Investori, drahé nehnuteľnosti, kupujúci porovnávajúci desať inzerátov.",
  },
  story: {
    key: "story",
    label: "Príbeh miesta",
    hint: "Nezačína nehnuteľnosťou, ale životom v nej.",
    bestFor: "Rodinné domy, vidiek, všade kde rozhoduje pocit a nie kalkulačka.",
  },
  honest: {
    key: "honest",
    label: "Čestný inzerát",
    hint: "Otvorene pomenuje jednu nevýhodu a hneď ju zarámuje.",
    bestFor: "Nehnuteľnosti s jasnou chybou. Odfiltruje zbytočné obhliadky.",
  },
};

const VARIANT_INSTRUCTION: Record<ListingVariantKey, string> = {
  conversion:
    "ŠTÝL: vysoko konverzný. Prvá veta je háčik, ktorý zastaví scrollovanie. " +
    "Konkrétny benefit, potom dôvod konať teraz (dopyt v lokalite, cena pod priemerom, " +
    "obmedzený termín obhliadok). Zakonči jednoznačnou výzvou na akciu. " +
    "Urgencia musí byť pravdivá — nikdy si nevymýšľaj počet záujemcov.",

  facts:
    "ŠTÝL: fakty na stôl. ZAKÁZANÉ všetky hodnotiace prídavné mená bez čísla — " +
    "žiadne 'priestranný', 'útulný', 'výborný'. Píš len overiteľné údaje: rozmery " +
    "jednotlivých miestností ak sú známe, orientácia, energetická trieda, mesačné " +
    "náklady, právny stav, dostupnosť MHD v minútach. Krátke oznamovacie vety. " +
    "Predávaš tým, čo NECHÝBA. Ak údaj nemáš, napíš 'neuvedené' — nedomýšľaj si ho.",

  story:
    "ŠTÝL: príbeh miesta. Prvý odsek NESMIE začať nehnuteľnosťou — začni ránom, " +
    "cestou z domu, tým čo je za rohom, ako tam padá svetlo. Až druhý odsek prejde " +
    "na dispozíciu. Predávaš život v tom mieste, nie meter štvorcový. " +
    "Zostaň pravdivý: opíš len to, čo z uvedených údajov a poznámok makléra vyplýva. " +
    "Žiadne vymyslené kaviarne ani parky, ktoré tam nemusia byť.",

  honest:
    "ŠTÝL: čestný inzerát. V prvej tretine textu otvorene pomenuj JEDNU skutočnú " +
    "nevýhodu, ktorá vyplýva zo zadaných údajov (pôvodný stav, vysoké poschodie bez " +
    "výťahu, chýbajúce parkovanie, rušná ulica, malá výmera k cene) a HNEĎ ju zarámuj " +
    "— najčastejšie cez cenu alebo cez to, komu to nevadí. Zvyšok textu je vecný. " +
    "Cieľ je odfiltrovať ľudí, ktorí by na obhliadke odišli po dvoch minútach. " +
    "Ak z údajov žiadna nevýhoda nevyplýva, napíš to úprimne: uveď, čo nie je " +
    "z inzerátu zrejmé a treba to overiť na obhliadke. NIKDY si nevymýšľaj chybu.",
};

export type ListingVariants = Record<ListingVariantKey, ListingContent>;

export type ListingVariantsAudit = {
  model: string;
  costEur: number;
  latencyMs: number;
  variants: ListingVariantKey[];
};

export function buildVariantsPrompt(
  property: PropertyInput,
  persona: ListingPersona = "GENERAL",
): string {
  const base = buildListingUserPrompt(property, persona);
  // Zoberieme opis nehnuteľnosti z existujúceho promptu, ale nahradíme
  // záverečnú JSON inštrukciu viacvariantnou — jeden zdroj pravdy pre vstup.
  const propertyBlock = base.split("Vygeneruj JSON:")[0].trim();

  const variantSpecs = LISTING_VARIANT_KEYS.map(
    (k) => `--- ${k} (${LISTING_VARIANTS[k].label}) ---\n${VARIANT_INSTRUCTION[k]}`,
  ).join("\n\n");

  return `${propertyBlock}

Stratégia pre kupujúceho (platí pre VŠETKY varianty): ${PERSONA_CONTEXT[persona]}

Vygeneruj ŠTYRI ÚPLNE ROZDIELNE varianty toho istého inzerátu. Rovnaká nehnuteľnosť,
rovnaká cieľová skupina — iný spôsob písania. Varianty sa NESMÚ podobať: ak by sa
dali zameniť, úloha je nesplnená.

${variantSpecs}

Každý variant obsahuje všetkých šesť polí. Dodrž rozsahy:
- portal_text: 260-320 slov, zakončiť výzvou na akciu
- fb_ad_copy: 65-80 slov
- ig_caption: 2 krátke odstavce + 7 slovenských hashtagov
- email_subject: max 52 znakov, bez emoji
- email_body: 160-200 slov
- seo_keywords: 6 konkrétnych hľadaných výrazov

Výstup je VÝHRADNE tento JSON, bez markdownu a komentárov:
{
  "conversion": { "portal_text": "...", "fb_ad_copy": "...", "ig_caption": "...", "email_subject": "...", "email_body": "...", "seo_keywords": ["..."] },
  "facts":      { ...rovnaké polia... },
  "story":      { ...rovnaké polia... },
  "honest":     { ...rovnaké polia... }
}`;
}

/** Doplní chýbajúce varianty prázdnymi objektmi — UI nesmie spadnúť na neúplnom JSON. */
export function normalizeVariants(raw: Partial<ListingVariants>): ListingVariants {
  const empty: ListingContent = {
    portal_text: "", fb_ad_copy: "", ig_caption: "",
    email_subject: "", email_body: "", seo_keywords: [],
  };
  return LISTING_VARIANT_KEYS.reduce((acc, k) => {
    acc[k] = { ...empty, ...(raw[k] ?? {}) };
    return acc;
  }, {} as ListingVariants);
}

export async function generateListingVariants(
  property: PropertyInput,
  persona: ListingPersona = "GENERAL",
): Promise<{ variants: ListingVariants; audit: ListingVariantsAudit }> {
  const t0 = Date.now();
  const response = await callClaude(
    {
      model: CLAUDE_SONNET,
      // 4 varianty × ~1100 tokenov + rezerva
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM_PROMPT_VARIANTS, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildVariantsPrompt(property, persona) }],
    },
    "listing-content-variants",
  );

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  return {
    variants: normalizeVariants(extractJson<Partial<ListingVariants>>(raw)),
    audit: {
      model: CLAUDE_SONNET,
      costEur: estimateClaudeCostEur(
        CLAUDE_SONNET,
        response.usage.input_tokens,
        response.usage.output_tokens,
      ),
      latencyMs: Date.now() - t0,
      variants: [...LISTING_VARIANT_KEYS],
    },
  };
}

export const SYSTEM_PROMPT_VARIANTS = `Si senior copywriter pre slovenský realitný trh s 15 rokmi skúseností. \
Píšeš texty čo skutočne predávajú — konkrétne, emocionálne, bez generických klišé. \
NIKDY nepoužívaj: "krásny byt", "ideálna poloha", "výnimočná príležitosť", "moderný", "priestranný". \
Dostávaš zadanie na ŠTYRI varianty toho istého inzerátu v rôznych štýloch. \
Varianty musia byť rozoznateľne odlišné — nie preformulovaním tých istých viet, \
ale iným uhlom pohľadu, inou stavbou textu a inou prvou vetou. \
NIKDY si nevymýšľaj fakty, ktoré nie sú v zadaní — ani vlastnosti, ani okolie, ani chyby. \
Výstup je VŽDY validný JSON bez komentárov a markdownu.`;
