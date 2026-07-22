Over stav implementácie `docs/briefs/overnight/overnight-brief-sandbox-gdpr.md`
(Časť A — sandbox tenant, Časť B — lead_consents) a nahlás mi presne toto,
bod po bode, bez sebachvály:

1. **Git/PR stav:** Je zmena zmergovaná do main? Číslo PR? Je nasadená na
   PROD (Vercel deploy log/URL)?

2. **Migrácie:** Bežali migrácie `valuation_tenants.is_sandbox`,
   `sandbox_submissions` a `lead_consents` na produkčnej DB? Vlož výstup
   `supabase migration list` alebo ekvivalent.

3. **Sandbox tenant:** Existuje v `valuation_tenants` riadok so slugom
   `demo`, `is_sandbox=true`, `enabled=true`? Vypíš ten riadok (bez
   citlivých údajov).

4. **Live test:** Otvor `/odhad/demo` (produkčná URL) a potvrď:
   - stránka sa načíta a zobrazí badge "Ukážková verzia",
   - formulár funguje cez všetky kroky až po odhad,
   - po odoslaní kontaktu skontroluj v DB: pribudol riadok v
     `sandbox_submissions` (áno/nie, koľko), NEpribudol riadok v `leads`
     (potvrď počet pred/po).

5. **Regresný test na Smolka:** Over, že `/odhad/reality-smolko` funguje
   nezmenene — lead vzniká, `lead_consents` sa zapisuje v tej istej
   transakcii, notifikácia sa volá.

6. **Testy z briefu:** Bežia acceptance testy z časti "TESTY CELKU"
   (demo happy path, Smolko regres, chýbajúci GDPR checkbox, rate limit)?
   Vlož výsledok testovacieho behu (pass/fail počty), nie len "testy OK".

7. **Odchýlky:** Vypíš každú odchýlku od pôvodného briefu (napr. iný názov
   tabuľky, iná štruktúra `agency_id` pre sandbox) — ak žiadne, napíš
   explicitne "žiadne odchýlky".

8. **Čo chýba/blokuje:** Ak niečo z vyššie uvedeného nie je hotové, napíš
   presne čo a prečo — nepíš len "hotovo", kým to fakt nie je overené
   krokom 4 a 6.

Formát odpovede: číslovaný zoznam 1–8 vyšie, každý bod max 2-3 vety,
s konkrétnym dôkazom (link na PR, výstup príkazu, screenshot popis) —
nie len tvrdenie.
