---
title: "Revolis AntiPattern Log"
project: Revolis.AI
type: governance
status: living-document
created: 2026-06-16
tags: [revolis, antipatterns, lessons, kontrolor]
related:
  - "[[kontrolor-SKILL]]"
  - "[[revolis-constitution-v2]]"
  - "[[engineering-os-revolis-rightsized]]"
---

# REVOLIS ANTIPATTERN LOG

> Nie teoretické antipatterns z učebnice — REÁLNE chyby, ktoré tento projekt
> spravil. Každá má symptóm, detekciu, fix a Kontrolór check, čo ju chytí.
> Cieľ: nikdy tá istá chyba dvakrát. Nový incident → nový záznam tu.

## AP-001 — Fake metriky vydávané za live dáta
**Symptóm:** dashboard zobrazuje "94.8% neural prediction", "1,42M € likvidita",
"9 alerts" — pekné čísla bez reálneho zdroja.
**Detekcia:** GUARD test hľadá zakázané reťazce v rendere; číslo bez dohľadateľného
zdroja dát.
**Fix:** dlaždica je `live` LEN s reálnymi dátami, inak čestne `pending`. Brief 9 v2.
**Kontrolór check:** bod 6 (fikcia dát) → STOP.

## AP-002 — RLS diera: anon insert / NULL klapka / prekrývajúce policy
**Symptóm:** tabuľka s `agency_id`, ale cross-tenant SELECT/INSERT prejde
(`leads`, `properties`, `outreach_logs` to mali).
**Detekcia:** centrálny `rls-tenant-isolation.test.ts` — cross-tenant assertion.
**Fix:** jedna striktná tenant policy cez `profile_agencies_for_auth()`,
`agency_id NOT NULL`, žiadny anon write. Brief 12 Wave A.
**Kontrolór check:** bod 8 (verifikácia, RLS na osobných údajoch) → STOP.

## AP-003 — Hádaná schéma namiesto reálnej vzorky
**Symptóm:** mapper/import mapuje na polia, ktoré sú vymyslené, nie z reálneho
payloadu (pôvodne `build-dossier.ts` mieril na neexistujúcu tabuľku `contacts`).
**Detekcia:** import zlyhá na neexistujúcich poliach; alebo ticho koruptuje dáta.
**Fix:** mapper sa stavia LEN z reálnej vzorky (`RealsoftSampleRequiredError`
guardrail). Brief 10.
**Kontrolór check:** bod 3 (nepodložený predpoklad) + bod 6 (hádaná schéma) → STOP.

## AP-004 — Credentials v plaintexte
**Symptóm:** heslo k externému systému uložené/porovnávané ako plaintext
(`realsoft_export_pass` pôvodne `rowPass === normalizedPass`).
**Detekcia:** grep na porovnanie hesla; chýbajúci hash/verify.
**Fix:** hash + DB-side verify cez RPC (service_role only), plaintext stĺpec
zhodený. Brief 10 hardening.
**Kontrolór check:** bod 8 (verifikácia, osobné/citlivé údaje) → STOP.

## AP-005 — Nepodložený predpoklad vydávaný za fakt
**Symptóm:** odporúčanie postavené na tom, ako systém "zvyčajne funguje", bez
overenia zo zdroja (tvrdenie "API vráti históriu" bez prečítania dokumentácie).
**Detekcia:** tvrdenie bez nálepky FAKT/PREDPOKLAD/NEZNÁME a bez dôkazu.
**Fix:** označ istotu; odporúčanie nesmie stáť na neoverenom predpoklade; over zo
zdroja alebo navrhni, ako overiť.
**Kontrolór check:** bod 1 (FAKT/PREDPOKLAD/NEZNÁME) + bod 3 (nepodložený predpoklad) → STOP.

## AP-006 — Zámena dvoch odlišných pojmov
**Symptóm:** dve mechanizmom odlišné veci sa miešajú do jednej (jednorazový export
vs kontinuálne API napojenie — obsahovo príbuzné, mechanizmom iné).
**Detekcia:** rozhodnutie zaobchádza s A a B ako keby boli zameniteľné.
**Fix:** rozdeľ pojmy, rozhodni o každom zvlášť.
**Kontrolór check:** bod 4 (zámena pojmov) → FLAG.

## AP-007 — Aktivita zamenená za pokrok
**Symptóm:** veľa mergnutých PR / "swarm beží celú noc" / preleštené docs — ale
moat sa neprehĺbil, ďalší klient nie je bližšie.
**Detekcia:** mesačná moat revízia: "čo nevie konkurencia?" = "nič nové".
**Fix:** biznis brána pred prácou (Ústava); meraj klientov + tok dát, nie objem commitov.
**Kontrolór check:** bod 5 (biznis brána) → FLAG.

## AP-008 — Junk v produkčnej schéme (governance diera)
**Symptóm:** neočakávané tabuľky v prod DB mimo migračnej histórie
(`AI AGENT AUTOMAT ONBOARDING` a pod.) = niečo má DDL write do produkcie.
**Detekcia:** porovnanie prod schémy s migračnou históriou.
**Fix:** agenti/swarm bez DDL prístupu do produkcie; schéma len cez migrácie + PR.
Brief 12 Wave B.
**Kontrolór check:** bod 8 (verifikácia) + povinný STOP (deštruktívny/schéma zásah).

## AP-009 — Agent vráti text namiesto artefaktu
**Symptóm:** agent "odpovedal ✅" peknou prózou/plánom, ale nevytvoril vetvu,
commit ani diff. Výstup vyzerá ako práca, reálne sa nezmenilo nič
(nočný swarm wave12c/d/e + wave13c: text, žiadne commity).
**Detekcia:** po behu `git branch` prázdny, `git status` čistý, žiadne PR.
"Odpovedal" ≠ "spravil".
**Fix:** done je definované ako OVERITEĽNÝ ARTEFAKT — existuje commit + zelené
CI — nie ako "agent dohovoril". Open loop bez brány produkuje slop; brána musí
byť niečo, s čím sa agent nevie hádať (build/test/CI), nie jeho vlastné vyhlásenie.
**Kontrolór check:** bod 8 (verifikácia) + nové pravidlo nižšie.

## AP-010 — Success response napriek tichému zlyhaniu side-effectu
**Symptóm:** operácia vráti úspech (napr. UC `{ code: 1 }`), ale povinný vedľajší
efekt chýba — audit riadok v `realsoft_import_logs`, notifikácia, webhook log.
Handler zaloguje len `logWarn` a klientovi vráti success.
**Detekcia:** response OK, ale očakávaný side-effect v DB/logu chýba (napr. tabuľka
audit 0 riadkov po smoke, zatiaľ čo `properties` má záznam). Kontrolór: side-effect
≠ predpoklad, over query.
**Fix:** ak je audit povinný, zlyhanie `store*Log` musí buď failnúť celú operáciu
(nie success response), alebo vrátiť explicitné varovanie v response — nikdy tiché
`code: 1`. Pred produkčným handoffom overiť audit query, nie len HTTP body.
**Kontrolór check:** bod 6 (fikcia úplnosti) + bod 8 (verifikácia side-effectu) → STOP.

## AP-011 — Guard chytá konkrétne meno, nie vzor
**Symptóm:** bezpečnostný/zakázaný guard hľadá presný reťazec (`stealth-recruiter`),
obíde ho rovnaká vec pod iným menom (`stealth-funnel`, `stealth-lead`,
`stealth-funnel-programs`). CI a automerge vyzerajú bezpečné, ale nový variant
prejde.
**Detekcia:** zakázaná lead-gen funkcionalita prejde CI; grep guard matchuje len
staré meno; nové súbory/routy existujú pod `stealth-funnel*` / `(marketing)/start`.
**Fix:** guard hľadá **vzor** (regex rodina mien `stealth[-_]?(funnel|lead|recruiter|program)`),
nie jeden string; vercel.json + `apps/crm/src` + automerge denylist zjednotené;
grandfathered `stealth-recruiter` API strom ostáva až do removal ticketu — nové
varianty a marketing `/start` funnel blokované.
**Kontrolór check:** bod 8 (verifikácia) — pri každej novej „legal hold" oblasti
over, či guard matchuje **triedu mien**, nie jeden historický slug.

## AP-012 — (rezervované)

## AP-013 — Time-coupled flaky test (zmrazený fixture, reálny Date.now())
**Symptóm:** test prejde pri merge, o pár dní padne v CI bez zmeny kódu. Test zmrazí
čas pre fixture (`const NOW = …`, `daysAgo(n)`), ale testovaná funkcia volá
`Date.now()` pri filtrovaní prahov (napr. `minDaysWithoutContact: 7`). Ako reálny
čas prekročí prah vo fixture, funkcia začne vracať záznam, ktorý test očakáva ako
prázdny → `expected length 0 but got 1`.
**Príklad (2026-06-21):** `seller-rescue.test.ts` — `lead-2` mal `last_contact:
daysAgo(2)` voči `NOW=2026-06-16` (2 dni), ale `pickSellerRescueCandidates` počítal
dni cez `Date.now()` (~2026-06-21) → 7 dní → kandidát v zozname.
**Detekcia:** test s relatívnymi dátumami + funkcia bez vstreknutého času; grep
`daysAgo|NOW` v teste vs `Date.now()` v implementácii bez parametra.
**Fix:** funkcia prijme voliteľný `nowMs` (test hook); produkcia ho vynechá
(`Date.now()`). Test vstrekne zmrazený `NOW`. **Nikdy** neopravovať zmenou
očakávania (`toHaveLength(0)` → `(1)`) — to maskuje bug alebo časovú väzbu.
**Kontrolór check:** bod 8 (verifikácia) — pri padnutí testu po čase bez diffu
skontroluj časovú väzbu pred zmenou assertion.

---
## Ako pridať nový antipattern
Keď nastane incident: zapíš sem AP-NNN (symptóm / detekcia / fix / Kontrolór check),
a ak treba, pridaj nový bod do `kontrolor` skillu. Tým sa systém učí — chyba sa
stane pravidlom, ktoré ju nabudúce chytí.
