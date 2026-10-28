/** Formát sumy z centov (zobrazenie; hodnoty prichádzajú hotové z katalógu cenníka v2). */
export function formatEurCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${euros},${rest} €`;
}

export function formatUserRange(minUsers: number, maxUsers: number | null): string {
  if (maxUsers === null) return `${minUsers} a viac maklérov`;
  if (minUsers === maxUsers) return minUsers === 1 ? "1 maklér" : `${minUsers} makléri`;
  return `${minUsers}–${maxUsers} maklérov`;
}

/**
 * Ročná zľava oproti mesačnej platbe v % (zaokrúhlená), počítaná z katalógu: 1 − ročná/mesačná cena.
 * Mesačná cena je základ × 1,2, takže skutočná zľava je ≈ 16,7 % (nie 20 %) – nikdy ju nepíš natvrdo.
 */
export function annualDiscountPercent(band: { netCents: number; monthly: { netCents: number } }): number {
  if (band.monthly.netCents <= 0) return 0;
  return Math.round((1 - band.netCents / band.monthly.netCents) * 100);
}
