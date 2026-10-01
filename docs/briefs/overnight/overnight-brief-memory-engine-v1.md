# OVERNIGHT: Revolis Memory Engine V1 — záväzný scope fence k mandátu

**Cieľová cesta:** `docs/briefs/overnight/overnight-brief-memory-engine-v1.md`
**Klasifikácia:** Core Platform základ (opakovaný manuálny problém: strata
kontextu, rekonštrukcia rozhodnutí a stavu — dnes už N-krát). NIE Strategic
Bet (otvorený je n8n bet). **Plný FABLE mandát platí; tento dokument je
nadradený scope fence pre PRVÚ noc.**

## KROK 0 — vstupy do repa
Ulož tri vstupné texty (Memory Engine / Revolis Brain / secret gunpowder +
Decision→Outcome) do `docs/architecture/inputs/memory-engine-sources-2026-07.md`
(jeden súbor, tri sekcie, doslovne). Normalizovaný kanonický model potom
vytvor v `docs/architecture/memory-engine-canonical-model.md` (max 3 strany).

## V1 SCOPE — implementuj DNES V NOCI (vertikálny rez)
1. **Register (Memory Layer):** `brain/registry/` — štruktúrované YAML/JSON
   záznamy podľa kanonickej schémy z mandátu (id, typ, názov, účel, vlastník,
   stav, zdroj, vznik, posledné overenie, závislosti, súvisiace rozhodnutia,
   dôkaz, confidence, citlivosť). TypeScript loader + schema validátor.
   ŽIADNA nová DB, žiadny graph store — repo súbory sú kanonické úložisko.
2. **Decision Memory:** `brain/decisions/` — záznamy podľa schémy mandátu.
   Ingest existujúcich rozhodnutí z `memory/decisions.md`, docs/architecture/
   a .cursor/rules (každé pravidlo s dôvodom = rozhodnutie). Minimálne 15
   reálnych historických rozhodnutí (Realvia fix, Stripe send_invoice,
   pricing lock, sandbox UUID, lead_consents text-id, atomicita nasadenia,
   n8n guardrails, Kontrolór language rule…) — zo skutočných zdrojov v repe,
   nie vymyslené.
3. **Ingest skript:** prejde repo (docs/, migrations/, automation/n8n/,
   package.json závislosti, .github/workflows, apps/crm routes) a vygeneruje
   registry záznamy s `zdroj` + `dôkaz` (cesta+commit). Idempotentný.
4. **Audit CLI:** `pnpm brain:audit` — kontroly: duplicity (podľa správania),
   staleness (posledné overenie > 30 d), rozpory docs vs kód (heuristiky:
   mŕtve odkazy, neexistujúce cesty, spomínané tabuľky/routes ktoré nie sú
   v kóde), nepoužívané aktíva, rozhodnutia bez výsledku po čase. Výstup:
   `brain/audits/YYYY-MM-DD.json` + čitateľný MD report + **delta oproti
   predchádzajúcemu auditu**. Chýbajúci zdroj = `unavailable`, nie demo dáta.
5. **Learning summary generátor:** `pnpm brain:weekly` — z audit delty +
   git log vygeneruje týždenný súhrn (čo pribudlo/zmenilo sa/zastaralo +
   max 5 prioritizovaných odporúčaní s dôkazom a confidence). Reálne dáta
   only; marketingové/zákaznícke metriky = `unavailable` (zdroj neexistuje).
6. **Testy + runbook:** fixtures, regresné testy auditu (idempotencia,
   delta správnosť), `docs/architecture/memory-engine-runbook.md` (spustenie,
   obnova, riešenie chýb). Traceability matica podľa mandátu.

## EXPLICITNE MIMO V1 (backlog s bránami — zapíš, neimplementuj)
- Observation Layer agenti (Guardian/Librarian/… = schopnosti, nie shelly) →
  brána: V1 audit beží 2 týždne a founder ho reálne používa.
- Recommendation dashboard UI → brána: 4 týždenné summary vygenerované.
- Zákaznícke/marketingové/CRM metriky ingest → brána: existujúci dátový zdroj.
- Decision→Outcome loop v PRODUKTE (pre zákazníkov) → ostáva v odloženom
  roadmape (3 zákazníci) — V1 je interný engineering/firma-level.
- **Nočný scheduler:** V1 sa spúšťa manuálne + ako CI krok na PR (audit bez
  zlyhania buildu, len report artifact). Rozhodnutie n8n vs Vercel cron =
  samostatná founder brána PO V1. Nezakladaj žiadny nový cron.

## FOUNDER BRÁNY
Merge PR · akékoľvek nové DB objekty (nemajú byť žiadne) · zapnutie
scheduleru · zverejnenie čohokoľvek z brain/ mimo repa.

## NÁKLADY ČAKANIA (odpoveď na mandátovú otázku — kvantifikuj v reporte)
Odhadni z dnešného dňa: koľko minút stála rekonštrukcia stavu (status check,
Gmail forenzika, tracker sync) a extrapoluj na mesiac pri 2× viac zákazníkoch.
Toto číslo patrí do reportu ako baseline pre budúce merania úspory.

## REPORT (ráno)
ČO SA ZMENILO · TRACEABILITY MATICA (100 % požiadaviek V1) · DÔKAZ (CI run,
výstup `brain:audit` na reálnom repe, ukážka delta) · ODCHÝLKY · ČO ČAKÁ NA
FOUNDERA · commit ID. Max 5 blokujúcich otázok s odporúčanou odpoveďou.
