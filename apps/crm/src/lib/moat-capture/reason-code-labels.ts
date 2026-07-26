/** User-facing labels for moat reason_code v1 (Slovak). */
export const REASON_CODE_LABELS: Record<string, string> = {
  cena: "Cena",
  rychlost: "Rýchlosť / proces",
  vztah: "Vzťah / dôvera",
  exkluzivita: "Exkluzivita ponuky",
  ine: "Iné",
  konkurencia: "Konkurencia",
  rozmyslel_si: "Rozmyslel si",
  financovanie: "Financovanie",
  nedostupny: "Nedostupný / neodpovedá",
};

export function labelForReasonCode(code: string): string {
  return REASON_CODE_LABELS[code] ?? code;
}
