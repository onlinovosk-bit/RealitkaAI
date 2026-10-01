# rme-les-20260722-001 — Kód nasadený pred migráciou zhodil widget platiaceho zákazníka

**Cieľová cesta:** `brain/lessons/2026-07-22-kod-pred-migraciou.md`
**Dátum:** 2026-07-22 · **Kategória:** TECH · **Závažnosť:** vysoká

**chyba:** PR #311 (sandbox + `lead_consents`) sa zmergoval a nasadil na
produkciu skôr, než sa na produkčnú DB aplikovala migrácia
`20260722120000_sandbox_gdpr_consent.sql`. Kód čítal stĺpce
(`agency_id, is_sandbox`), ktoré v schéme ešte neexistovali.

**dopad:** `app.revolis.ai/odhad/reality-smolko` vracal HTTP 500 —
valuačný widget **jediného platiaceho zákazníka** bol mimo prevádzky
niekoľko hodín. Každý majiteľ, ktorý naň v tom čase klikol, narazil na
chybu namiesto formulára. Zároveň bol zablokovaný štart Google Ads
(variant B mieril na nefunkčnú stránku).

**rootCause:** V procese neexistovalo poradie „migrácia PRED deploy".
Merge PR automaticky spustil deploy, migrácia bola samostatný manuálny krok
bez väzby na merge. Chýbal aj connection string (`POSTGRES_URL_NON_POOLING`
prázdny vo Vercel env), takže migráciu nebolo možné spustiť ani reaktívne
bez zásahu foundera.

**detekcia:** Náhodou — founder otvoril stránku pri inej úlohe.
**Žiadny stroj to nezachytil.** Odhadovaná strata: hodiny.

**fix:** Migrácia aplikovaná manuálne (Supabase SQL Editor / skript
`apply-sandbox-gdpr-prod.mjs`), následne nezávisle overené HTTP 200 na
`/odhad/reality-smolko` aj `/odhad/demo`.

**prevencia:**
1. Pravidlo atomicity nasadenia v `.cursor/rules/architecture.mdc`:
   poradie vždy (1) migrácia na PROD DB → (2) overenie schémy → (3) deploy
   kódu → (4) smoke test kritických routes. PR s migráciou má tento
   4-krokový checklist v popise; merge bez potvrdeného kroku 1 = incident.
2. **n8n W2 heartbeat watchdog** — každých 30 min kontroluje
   `/odhad/reality-smolko` a `/odhad/demo`, pri stave ≠200 posiela email
   founderovi. Nasadený a otestovaný 22.07 (poplach doručený).
3. Deploy freeze na widget routes počas platenej kampane (okrem hotfixov).

**prevenciaOverena:** true — watchdog otestovaný simulovaným výpadkom
(rozbitá URL → email dorazil). Pravidlo atomicity je zapísané v rules;
prvé reálne overenie príde pri najbližšej migrácii.

**suvisiaceRozhodnutia:** atomicita nasadenia; W2 watchdog v n8n V1;
premortem riziko #4 pre Ads kampaň.
