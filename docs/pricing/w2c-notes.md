# W2-C (marketing) — poznámky

Stav: TESTED v izolovanom worktrees, nič nezverejnené. Prepínač `PRICING_V2_ENABLED` (rovnaký názov ako v CRM).

## BLOCKER: cieľová URL registrácie
Kontrakt neurčuje URL registrácie s parametrami plánu. CRM `/register` dnes číta len `error` a `email`.
Dočasný placeholder v `apps/marketing/lib/pricing-v2-view.ts`:
`{NEXT_PUBLIC_CRM_URL ?? https://app.revolis.ai}/register?pricing=v2&plan=<start|team|office>[&pack=<kredity>]`.
Pred zapnutím v produkcii musí CRM (vetva B/koordinátor) tieto parametre prečítať a po registrácii presmerovať na
checkout podľa kontraktu (so správnym agencyId). Do rozhodnutia sa parametre ignorujú a návštevník pristane na bežnej registrácii.
Pásmo Sieť (od 349 €) vedie na demo (Calendly), nie do registrácie.

## Poznámky
- `/` a `/demo` sú statické: prepínač sa vyhodnotí pri builde, zmena env vyžaduje nový deploy.
- Testy: `apps/marketing/__tests__` (vitest z workspace; marketing nemá vlastnú devDependency, aby sa nemenili lockfily).
- Zlaté súbory `__tests__/__golden__` vznikli z commitu 26641e8 pred zmenou kódu (dôkaz nezmeneného legacy výstupu).
