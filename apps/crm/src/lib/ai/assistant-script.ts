export type AssistantContext = "call" | "deal" | "default";

/**
 * Otázky pre `/api/leads/[id]/assistant` (POST) — server volá OpenAI s kontextom leadu z DB.
 */
export function assistantQuestionForContext(context: AssistantContext): string {
  if (context === "call") {
    return (
      "Priprav mi konkrétny call script pre tento kontakt: čo povedať ako prvé, " +
      "3 body na rozhovor a jednu vetu na uzavretie ďalšieho kroku. Max 5 krátkych viet."
    );
  }
  if (context === "deal") {
    return (
      "Aké sú najbližšie kroky na uzavretie obchodu s touto príležitosťou? " +
      "Uveď prioritu a čo treba zistiť od klienta. Max 5 krátkych viet."
    );
  }
  return (
    "Čo je najdôležitejší jeden ďalší krok s touto príležitosťou a prečo? Max 4 vety."
  );
}

/**
 * Fallback text, keď API nie je dostupné (bez kľúča, offline lead, chyba).
 */
export function generateAssistantMessage(context: AssistantContext): string {
  if (context === "call") {
    return "AI ti pripravila ideálny call script pre klienta.";
  }

  if (context === "deal") {
    return "AI ti pomôže uzavrieť tento obchod.";
  }

  return "AI ti pomáha robiť lepšie rozhodnutia.";
}
