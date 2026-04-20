export type AssistantContext = "call" | "deal" | "default";

export function assistantQuestionForContext(ctx: AssistantContext): string {
  switch (ctx) {
    case "call":
      return "Aké sú kľúčové body pre nadchádzajúci hovor s týmto leadom? Navrhni konkrétne otázky.";
    case "deal":
      return "Ako uzavrieť tento obchod? Aké sú hlavné námietky a ako ich prekonať?";
    default:
      return "Zhrň stav tohto leadu a navrhni ďalší krok.";
  }
}

export function generateAssistantMessage(ctx: AssistantContext): string {
  switch (ctx) {
    case "call":
      return "Priprav sa na hovor: zisti motiváciu klienta, časový rámec a rozpočet.";
    case "deal":
      return "Identifikuj hlavného rozhodovatela a navrhni konkrétnu ponuku s jasnou hodnotou.";
    default:
      return "Skontroluj históriu komunikácie a naplánuj ďalší kontakt do 48 hodín.";
  }
}
