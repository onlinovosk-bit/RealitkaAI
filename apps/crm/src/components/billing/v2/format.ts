/** Formát sumy z centov (zobrazenie; hodnoty prichádzajú hotové z katalógu cenníka v2). */
export function formatEurCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}${euros},${rest} €`;
}

export function formatUserRange(minUsers: number, maxUsers: number | null): string {
  if (maxUsers === null) return `${minUsers} a viac používateľov`;
  if (minUsers === maxUsers) return minUsers === 1 ? "1 používateľ" : `${minUsers} používatelia`;
  return `${minUsers}–${maxUsers} používateľov`;
}
