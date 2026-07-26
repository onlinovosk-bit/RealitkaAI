# OVERNIGHT BRIEF: Guardian v1 (strážca obchodného procesu)

**Cieľová cesta:** `docs/briefs/overnight/overnight-brief-guardian-v1.md`
**Kategória:** Core Platform (dokázaný problém: 439 Smolko kontaktov,
"zabudnuté leady" reálne existujú). **Noc 2 z 2 — spustiť AŽ PO merge
moat-capture** (obe noci = migrácia; pravidlo 1 migrácia/PR, sekvenčne).
**Premortem:** nižšie; kópiu ulož do `docs/premortems/2026-07-27-guardian-v1.md`.

## Cieľ
Hodinová kontrola leadov proti 4 pravidlám → nálezy do `guardian_findings`
→ **1× denne** digest notifikácia. Detekuj hodinovo, notifikuj denne —
alert fatigue je smrť takýchto systémov.

## Rozhodnutie o schedulери (záväzné)
**Vercel cron** (vzor heartbeat-check + CRON_SECRET), NIE n8n — n8n
guardrail zakazuje zápis do PROD DB a spracovanie zákazníckych dát
(tooling doc: rozdelenie autority). Jeden scheduler, žiadna duplicita.

## Pravidlá v1 (konštanty v kóde, prahy meniteľné bez migrácie)
- R1 STALE: aktívny lead bez záznamu v `lead_events` > 7 dní
- R2 NO_OWNER: aktívny lead bez priradeného makléra > 24 h
- R3 NO_PHONE: lead so stavom vyžadujúcim kontakt bez telefónu
- R4 HOT_IGNORED: `ai_priority` vysoká + bez aktivity > 48 h
"Aktívny" = nie won/lost/archived. Presné stavy odvoď z reálneho enum
v repe (Krok 0 — nahlás).

## Migrácia (JEDNA, aditívna)
```sql
create table guardian_findings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  lead_id text not null references leads(id),
  rule_code text not null check (rule_code in
    ('STALE','NO_OWNER','NO_PHONE','HOT_IGNORED')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  digest_sent_at timestamptz,
  meta jsonb
);
create unique index guardian_open_unique
  on guardian_findings(agency_id, lead_id, rule_code)
  where resolved_at is null;                 -- idempotencia
create index on guardian_findings(agency_id, detected_at desc);
```
RLS per-tenant (vzor leads).

## Runner logika
1. Per agency (indexovaný dotaz, limit dávky): vyhodnoť R1–R4.
2. Nový nález → insert (unique index ticho zabráni duplicite — ON CONFLICT
   DO NOTHING). Existujúci open nález → nič.
3. **Auto-resolve:** pri behu over open nálezy — ak podmienka pominula
   (prišla aktivita/owner/telefón) → set resolved_at. Nálezy sa čistia samé.
4. Denný digest (samostatný cron 07:00): open nálezy s digest_sent_at null
   ALEBO starším než 24 h → JEDEN email per agency: **počty per pravidlo +
   linky do CRM, ŽIADNE osobné údaje leadov v tele emailu** + dashboard
   badge (count endpoint pre existujúci insights panel).

## PRVÝ BEH — baseline režim (kritické!)
Prvé spustenie na Smolkovi pravdepodobne nájde desiatky/stovky STALE
nálezov naraz (439 kontaktov, mnohé staré). Prvý beh: insert nálezov ÁNO,
digest email NIE — namiesto neho report founderovi (počty per pravidlo).
Founder rozhodne prahy/výnimky, až potom sa digest zapne (env flag
GUARDIAN_DIGEST_ENABLED, default false).

## Nasadenie — atomicita ako v capture briefe. Migráciu spúšťa founder.

## Acceptance
Unit: každé pravidlo + auto-resolve + idempotencia (2 behy = žiadne dupl.)
· digest formátovací test bez PII · cron auth test (CRON_SECRET vzor
heartbeat, vrátane 401 case — poučenie z júnovej mŕtvej triage!) ·
e2e: umelý stale lead → finding → aktivita → resolved · brain registrácia.

## PREMORTEM (je 26.08.2026, Guardian zlyhal, pretože...)
| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | Prvý beh poslal Smolkovi email s 300 nálezmi — panika/nedôvera | 3 | 3 | 9 | baseline režim + digest za env flagom, zapína founder; Kill: >50 nálezov v prvom behu → žiadny email, founder review |
| 2 | Digest chodil denne so stále tými istými nálezmi — alert fatigue, ignorácia | 3 | 2 | 6 | digest_sent_at throttle 24 h + auto-resolve; check-in po 14 d: pomer resolved/open |
| 3 | Cron mŕtvy ako júnová triage (CRON_SECRET/401) a nikto si nevšimol | 2 | 3 | 6 | auth test v CI + Guardian heartbeat riadok do existujúceho platform heartbeat (beh zapíše last_run) |
| 4 | Hodinový full-scan spomalil DB v špičke | 2 | 2 | 4 | indexy + limit dávky + meranie trvania v logu |
| 5 | PII leadov v notifikačnom emaile — GDPR expozícia | 2 | 3 | 6 | digest len počty+linky; formátovací test to vynucuje |
| 6 | Duplicitné open nálezy po retry crona | 2 | 2 | 4 | partial unique index + ON CONFLICT DO NOTHING + test 2 behov |

## ROLLBACK
Cron: odstrániť záznam z vercel.json = okamžité vypnutie (bez DB zásahu).
Digest: GUARDIAN_DIGEST_ENABLED=false. DB: tabuľka aditívna, pri rollbacku
sa NEdropuje. Poradie: cron/flag → kód → (DB nikdy). Test: over, že vypnutý
cron nenechá visieť open nálezy v nekonzistentnom stave (auto-resolve beží
v tom istom runneri — vypnutie zmrazí, nezruší).

## MONITORING
Guardian zapisuje last_run + trvanie + počet nálezov do platform heartbeat;
chýbajúci beh > 2 h = advisory v existujúcom heartbeat cron-e (strážca má
vlastného strážcu — poučenie z lesson kod-pred-migraciou: "žiadny stroj to
nezachytil").

## MEMORY UPDATE (po merge)
brain/decisions: (1) "Guardian scheduler = Vercel cron, nie n8n" s dôvodom
(autorita vrstiev); (2) "prahy R1–R4 v1" s review +30 d podľa baseline
čísel. Registry: guardian_findings + runner.

## RELEASE CHECKLIST + DoD
☐ Merge moat-capture PROD hotový (prerekvizita) → ☐ founder GO migrácia →
☐ migrácia → ☐ schéma → ☐ deploy → ☐ prvý beh BASELINE (digest off) →
☐ baseline report founderovi → ☐ founder upraví prahy → ☐ digest ON →
☐ CI/brain:check zelené → ☐ decisions+registry zapísané.

## PREMORTEM — doplnené kategórie (Build Package v1)
| # | Riziko | P | Z | Sk | Mitigácia |
|---|---|---|---|---|---|
| 7 | MULTI-TENANT: digest jednej agentúry obsahoval počty inej (JOIN bug) | 1 | 3 | 3 | digest query per agency_id + test izolácie s 2 seed agentúrami |
| 8 | ROLLBACK: cron vypnutý, ale dashboard badge ďalej ukazoval stale počty | 2 | 2 | 4 | badge endpoint číta open findings live — pri zmrazení ukáže posledný stav + timestamp last_run (viditeľná staroba dát) |
| 9 | MEMORY: nálezy sa riešili, ale nikto nezapísal PREČO leady stáli → Guardian upozorňoval, firma sa neučila | 2 | 2 | 4 | resolved nálezy vstupujú do brain:weekly súhrnu (počty per pravidlo/týždeň) — trend viditeľný founderovi |

## Founder brány
GO na PROD migráciu · merge · zapnutie GUARDIAN_DIGEST_ENABLED po review
baseline čísel · prahy R1–R4 (defaulty vyššie, uprav pri GO).
