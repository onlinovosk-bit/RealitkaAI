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

---
## Ako pridať nový antipattern
Keď nastane incident: zapíš sem AP-NNN (symptóm / detekcia / fix / Kontrolór check),
a ak treba, pridaj nový bod do `kontrolor` skillu. Tým sa systém učí — chyba sa
stane pravidlom, ktoré ju nabudúce chytí.
