export type ProspectEmailInput = {
  name: string;
  city: string | null;
  listingsCount: number;
};

/**
 * Deterministic cold-email draft for outbound prospecting (not OpenAI — no extra cost, predictable tests).
 */
export function generateProspectEmail(lead: ProspectEmailInput): string {
  const city = lead.city?.trim() || "vašom regióne";
  const n = lead.listingsCount;

  return `Dobrý deň,

vidím, že v ${city} máte v ponuke približne ${n} inzerátov — pracujete s veľkým objemom dopytu.

V tejto fáze väčšina realitných tímov stráca obchodné príležitosti tým, že nevie priorizovať, komu sa ozvať ako prvému a čo presne povedať.

Revolis.AI (CRM + AI scoring + automatizovaná komunikácia) to zjednocuje na jednom mieste. Ukážem vám to na vašich dátach v krátkom 15-minútovom calli.

Dáva vám to zmysel tento týždeň?

S pozdravom,
Tím Revolis.AI
`;
}
