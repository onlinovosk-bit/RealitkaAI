import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export default function ProofHero() {
  return (
    <header className="mx-auto max-w-2xl px-4 pt-10 text-center sm:px-6 sm:pt-14">
      <p
        className="text-xs font-bold uppercase tracking-[0.28em]"
        style={{ color: SLATE_HORIZON.brandDeep }}
      >
        Proof of Value
      </p>
      <h1
        className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
        style={{ color: SLATE_HORIZON.ink }}
      >
        Koľko vám mesačne uniká na províziách?
      </h1>
      <p className="mt-4 text-sm leading-relaxed sm:text-base" style={{ color: SLATE_HORIZON.muted }}>
        5 minút, 6 otázok — dostanete odhad z vašich odpovedí a trhových benchmarkov.
        Presné čísla z vlastných dát ukážeme na deme.
      </p>
    </header>
  );
}
