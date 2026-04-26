export const BSM_REFORMA_CAMPAIGN = {
  campaignId: "bsm_2026_reforma",
  knowledgeBase: {
    effectiveDate: "1. Január 2026",
    keyChange:
      "Zmena v nakladaní s nehnuteľnosťami nadobudnutými pred manželstvom a dedením.",
    impactFactor:
      "Zvýšená administratívna záťaž pri predaji po 2026, nutnosť nových súhlasov.",
  },
  promptStructure:
    "Si seniorný realitný právnik a poradca. Napíš krátku, údernú správu pre [NAME]. Spomeň, že jeho nehnuteľnosť na [LOCATION] spadá pod novú BSM reformu 2026. Cieľom je vyvolať zvedavosť (Open Rate) a ponúknuť bezplatnú 5-minútovú konzultáciu k dopadu na cenu.",
} as const;

export type BsmMessageInput = {
  leadName: string;
  location: string;
};

export function buildBsmFallbackMessage(input: BsmMessageInput) {
  const name = input.leadName?.trim() || "Dobrý deň";
  const location = input.location?.trim() || "vašu nehnuteľnosť";
  return `${name}, od 1.1.2026 vstupuje do účinnosti reforma BSM, ktorá sa môže dotknúť predaja pre ${location}. Pri predaji po 2026 môže byť nutný nový súhlas a dodatočné právne kroky. Ak chcete, pripravím vám bezplatnú 5-minútovú konzultáciu, aby ste vedeli, či je výhodnejšie riešiť predaj ešte pred reformou.`;
}
