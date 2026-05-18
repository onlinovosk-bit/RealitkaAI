/**
 * Pre-mortem Sc. 2 — metriky ako koučing, nie tichý dohľad.
 */
export default function CoachingNotSurveillanceCallout({
  variant = "default",
}: {
  /** `compact` = menší vertikálny priestor (napr. pod nadpisom stránky). */
  variant?: "default" | "compact";
}) {
  const box =
    variant === "compact"
      ? "mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950"
      : "rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950";

  return (
    <div className={box} role="note">
      <p className="font-semibold text-emerald-900">Koučing, nie „sledovanie“</p>
      <p className="mt-1 text-emerald-900/90">
        Čísla majú pomôcť tímu zlepšiť konverzie a prácu — nie hodnotiť jednotlivca bez kontextu a spätnej väzby.
        Odporúčame zdieľať interpretáciu na porade a doplňovať CRM konzistentne, aby zmysel mali údaje aj AI.
      </p>
    </div>
  );
}
