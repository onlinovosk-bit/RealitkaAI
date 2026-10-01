---
id: report.u1-lead-events-write-path
title: "U1 — prečo sa public.lead_events na PROD nezapisuje"
type: report
status: final
version: 1.0.0
owner: founder
created_at: 2026-09-18
confidentiality: internal
canonical: false
---

# U1 — prečo sa `public.lead_events` na PROD nezapisuje

**Brána:** `GO U1` (founder, 2026-09-18) · **Režim:** READ ONLY — repo read, grep, read-only PROD SELECT.
**Vykonané:** žiadny INSERT/UPDATE/DELETE, žiadna migrácia, schema change, code change, flag change, deployment, merge.
**Projekt:** `ypgajkhqtbriqqmyawyv` (PROD) · **Čas PROD meraní:** 2026-09-18, 09:12–09:20 UTC

---

## 1. Executive finding

**PROVEN ROOT CAUSE.** `lead_events` sa nezapisuje, lebo **nemá čo by ho zapisovalo**.

V celom `apps/crm/src` existuje **jediná** write path do `lead_events`: `POST /api/ai/lead-events`. Tá má dve nezávislé blokády, z ktorých každá sama stačí:

1. **Nula volajúcich.** Žiadny komponent, hook, server action ani cron v aplikácii ten endpoint nevolá. Jediný výskyt reťazca `/api/ai/lead-events` mimo samotného route súboru je záznam v testovacom registri feature.
2. **Enterprise brána.** Route začína `isEnterpriseSalesIntelligenceEnabled()` → pri nesplnení vracia **403**. Gate prejde len pri pláne `enterprise` alebo `ENTERPRISE_AI_INTELLIGENCE_DEV=1`. **Žiadna z 6 agentúr na PROD nemá plán `enterprise`.**

**Nie je to chyba.** Nie je to RLS, nie je to schema drift, nie je to tiché zlyhanie insertu. Je to **funkcia, ktorá nebola nikdy napojená na životný cyklus leadu** — a dvaja konzumenti (`/operator`, Guardian) si z nej medzitým spravili závislosť.

Zároveň: udalosti o leadoch **sa na PROD zapisujú** — len inde. DB trigger `trg_leads_platform_events` na `public.leads` ich posiela do `platform_events` (1 417 riadkov). Ten trigger **nie je v žiadnej migrácii v repe**.

---

## 2. Skutočné write paths

| Cesta | Typ | Súbor | Stav |
|---|---|---|---|
| `POST /api/ai/lead-events` → `.from("lead_events").insert(...)` | app, HTTP | `apps/crm/src/app/api/ai/lead-events/route.ts:65–72` | **jediná; 0 volajúcich; Enterprise-gated** |

**FAKT.** Iná write path neexistuje. Grep `from("lead_events")` naprieč `apps/crm/src` + `apps/crm/scripts` vracia 9 zásahov; osem z nich je `.select(...)`, jeden `.insert(...)` — ten vyššie.

### Čitatelia (pre kontrast — všetci čítajú prázdnu tabuľku)

| Konzument | Súbor | Použitie |
|---|---|---|
| Operator dashboard | `lib/operator/gather.ts:118` | probe `select("agency_id").limit(1)` → `hasGlobalLeadEvents` |
| Operator dashboard | `lib/operator/gather.ts:204,219` | výpočet `reaction24hPct` |
| Guardian runner | `lib/guardian/runner.ts:33` | posledná aktivita leadu pre STALE v1.1 |
| Enterprise pipeline | `lib/db/enterprise-intelligence-store.ts:59` | `fetchLeadEventsOrdered` → skóre, riziko, DNA |
| Realtime UI | `lib/realtime/enterprise-lead-events.ts:26` | subscribe na INSERT |
| Prod audit skript | `scripts/guardian-v11-prod-audit.ts:72` | audit |

---

## 3. Očakávaný lifecycle (podľa návrhu v kóde)

```
UŽÍVATEĽSKÁ AKCIA (email_open | click | call | reply | note)
        ↓
  klient volá POST /api/ai/lead-events
        ↓
  Enterprise gate
        ↓
  lead_events INSERT
        ↓
  Realtime INSERT → UI refresh
        ↓
  enterprise pipeline: lead_scores, client_dna, deal_moments, ai_recommendations
        ↓
  Guardian STALE · /operator reaction24h
```

Povolené typy udalostí sú tvrdo obmedzené na päť: `email_open`, `click`, `call`, `reply`, `note` (`route.ts:9–15`). Ani jeden z nich sa negeneruje automaticky — všetkých päť predpokladá, že ich niekto explicitne nahlási.

## 4. Skutočný lifecycle na PROD

```
LEAD INSERT/UPDATE na public.leads
        ↓
  DB TRIGGER trg_leads_platform_events  (AFTER INSERT OR UPDATE, FOR EACH ROW)
        ↓
  public.emit_platform_event(agency_id, 'lead.created' | 'lead.status_changed', payload)
        ↓
  platform_events  ← 1 417 riadkov, 100 % agency_id
        ↓
  konzumenti: /api/events/stream (SSE), usePlatformRealtime, /api/system/health-dashboard

                    ✂ žiadne prepojenie ✂

  lead_events  ← 0 riadkov
        ↓
  /operator reaction24h = unavailable · Guardian STALE = nikdy
```

**FAKT**, definícia triggera (PROD, `pg_get_triggerdef`, 09:19 UTC):
```sql
CREATE TRIGGER trg_leads_platform_events
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION trg_leads_platform_events()
```
Funkcia je `SECURITY DEFINER`, `search_path=public`, emituje `lead.created` pri INSERT a `lead.status_changed` pri zmene `status`.

**FAKT:** `emitPlatformEventServer()` (`lib/platform-events-server.ts:16`) je volaný v aplikácii **jediný raz** — z `lib/ai/matching-engine.ts:35`. Drvivá väčšina zo 1 417 riadkov teda vzniká **v databáze, nie v aplikácii**.

---

## 5. PROD evidencia

Merané 2026-09-18, 09:12–09:20 UTC.

| Meranie | Výsledok | Nálepka |
|---|---|---|
| `count(*) public.lead_events` | **0** | FAKT |
| `count(*) public.platform_events` | **1 417** (`lead.created` 970, `lead.status_changed` 444, `integration.activity` 3) | FAKT |
| `public.activities` | 188 riadkov, najnovší 2026-09-06 | FAKT |
| plány agentúr | `Free`×3, `solo`×1, `Pro/market_vision`×1, `protocol_authority`×1 — **žiadny `enterprise`** | FAKT |
| `guardian_findings` podľa pravidla | `NO_OWNER` 15 (15 open), `NO_PHONE` 10 (0 open), `HOT_IGNORED` 8 (8 open) — **`STALE` = 0 riadkov** | FAKT |
| trigger na `public.leads` | `trg_leads_platform_events` (jediný netriviálny trigger) | FAKT |

### Celý Enterprise klaster je prázdny

| Tabuľka z `20260418_enterprise_ai_intelligence.sql` | Riadky |
|---|---:|
| `lead_events` | 0 |
| `lead_scores` | 0 |
| `client_dna` | 0 |
| `deal_moments` | 0 |
| `ai_recommendations` | 0 |

**FAKT.** Migrácia dopadla, tabuľky existujú, ani jedna nikdy nedostala riadok. To je nezávislé potvrdenie root cause: nie je rozbitá jedna write path, je nepoužitá celá vetva funkcionality.

---

## 6. RLS / permission analýza — **vylúčené ako príčina**

**FAKT** (PROD, `pg_policies`, 09:14 UTC):

```
tablename   : lead_events
rls_enabled : true
policyname  : lead_events_tenant
cmd         : ALL
roles       : {authenticated}
qual        : (agency_id IS NULL) OR (agency_id IN (SELECT profile_agencies_for_auth()))
with_check  : (agency_id IS NULL) OR (agency_id IN (SELECT profile_agencies_for_auth()))
```

`with_check` insert z vlastnej agentúry **povoľuje**. Route navyše `agency_id` odvodzuje z lookupu leadu, nie zo vstupu. RLS nie je blokér.

*(Poznámka: `agency_id IS NULL` vetva je permisívna — cross-tenant riziko pri NULL. Mimo rozsahu U1, hodnota pre neskorší RLS audit.)*

## 7. Schema / migration analýza — **vylúčené ako príčina**

**FAKT.** Stĺpce na PROD:
```
id:uuid, agency_id:uuid, lead_id:text, type:text, value:text, created_at:timestamptz
```
Migrácia `20260418_enterprise_ai_intelligence.sql:4–11` definuje presne tie isté. **Žiadny mismatch.** Insert v `route.ts:66–71` zapisuje `agency_id`, `lead_id`, `type`, `value` — všetky štyri existujú.

Kontrast s CP-EVIDENCE: `leads.last_contact_at` chýba (schema drift), `ai_action_audit` cost stĺpce chýbajú (schema drift). **`lead_events` drift nemá.**

**Migračná história:** z trojice `20260418`, `20260419`, `20260616123000` sú v `schema_migrations` **dve z troch**. Ktorá chýba, nebolo v rozsahu U1 rozlíšené — **UNKNOWN**, nízky dopad (tabuľka aj policy na PROD existujú).

**Drift opačným smerom (dôležitejší):** trigger `trg_leads_platform_events` a funkcia `emit_platform_event` **existujú na PROD a nie sú v žiadnej migrácii**. Repo to dokonca priznáva — `20260509000000_rls_lead_scores.sql:9`: *„platform_events — table does not exist in any migration"*. **Jediný funkčný event path Revolisu je nedokumentovaný a neverzovaný.**

## 8. Error handling analýza — **vylúčené ako príčina**

`route.ts` nič nepotláča:
- gate zlyhá → `errorResponse(..., 403)`
- neprihlásený → 401
- neplatný `type` → 400
- lead nenájdený → 404
- cudzia agentúra → 403
- chyba insertu → `errorResponse(error.message, 400)` — **správa sa vracia volajúcemu**

Kontrast: `lib/events/log-event.ts` chyby **ticho loguje** a `lib/ai/persist-cost-telemetry.ts` má tichý fallback (CP-EVIDENCE, oprava 2). Pri `lead_events` tichá cesta neexistuje — keby ju niekto volal a zlyhalo by to, bolo by to vidieť.

## 9. Alternatívne event cesty

| Tabuľka | Riadky | Zapisuje | Pokrýva lead_events? |
|---|---:|---|---|
| `platform_events` | 1 417 | DB trigger na `leads` | **čiastočne** — `lead.created`, `lead.status_changed`. **Neobsahuje** `email_open`, `click`, `call`, `reply`, `note` |
| `activities` | 188 | aplikácia | čiastočne — aktivita makléra, iný model |
| `broker_events`, `buyer_events`, `kataster_events` | 0 | — | nie |
| `public.events` | 0 | — | nie |

**Záver (FAKT):** udalosti *o vzniku a zmene stavu* leadu existujú v `platform_events`. Udalosti *o reakcii makléra na lead* — presne to, čo `/operator` meria ako „Reakcia 24 h" — **neexistujú nikde**.

---

## 10. Root cause

### PROVEN ROOT CAUSE

> `public.lead_events` má v aplikácii jedinú write path — `POST /api/ai/lead-events`. Tá nemá žiadneho volajúceho a zároveň je uzavretá za plán `enterprise`, ktorý na PROD nemá žiadna agentúra. Preto nemôže vzniknúť ani jeden riadok.

Dôkazy: §2 (jediný insert, 0 volajúcich), §5 (žiadny `enterprise` plán; celý klaster 5 tabuliek prázdny), §6 (RLS vylúčené), §7 (schema vylúčená), §8 (tiché zlyhanie vylúčené).

### Prispievajúci faktor (FAKT, nie špekulácia)

Dvaja konzumenti si na prázdnej tabuľke postavili závislosť **po tom**, čo tabuľka vznikla, a nikto neoveril, že sa napĺňa:
- `/operator` (`gather.ts`, PR #334, 29. 7.)
- Guardian v1.1 STALE (`decisions.md`, 27. 7.) — a `guardian_findings` má dnes **0 STALE riadkov**, čo je priamy dôsledok

### LIKELY BUT UNPROVEN

Žiadne. Root cause je dokázaný a alternatívne hypotézy (RLS, schema, tiché zlyhanie, zápis inam) sú každá samostatne vylúčené meraním.

### UNKNOWN — REQUIRES VERIFICATION

- **Zámer.** Či bol automatický emitter (napr. trigger alebo volanie z inbound/e-mail cesty) plánovaný a nedokončený, alebo bol manuálny zápis zámerný Enterprise feature. V repe sa nenašiel žiadny ADR ani záznam v `decisions.md` k `lead_events`. **UNKNOWN.**
- Ktorá z troch enterprise migrácií chýba v `schema_migrations`.
- Runtime logy PROD (Vercel) neboli v rozsahu U1 — ale pri 0 volajúcich nemajú čo obsahovať.

---

## 11. Confidence

| Tvrdenie | Istota |
|---|---|
| `lead_events` = 0 riadkov | **FAKT** — priame meranie |
| Jediná write path je Enterprise-gated API bez volajúcich | **FAKT** — vyčerpávajúci grep + čítanie route |
| RLS / schema / error handling nie sú príčinou | **FAKT** — každá vylúčená samostatným meraním |
| Root cause = nenapojená write path | **PROVEN** |
| Zámer autorov | **UNKNOWN** |

---

## 12. Dopad na `/operator`

**FAKT.** `gather.ts:118` robí probe `select("agency_id").limit(1)` → `hasGlobalLeadEvents = false` → vetva `else` (`gather.ts:230`) nastaví `reaction24hByAgency = null` pre **každú** agentúru.

Výsledok: stĺpec „Reakcia 24 h" bude prázdny pre všetkých nájomníkov, a `computeOperatorHealthScore` pripočíta `REACTION24H_UNKNOWN = −4` každému (`health-score.ts`). Health score je teda systematicky podhodnotený o 4 body naprieč platformou — nie chybne, ale bez informačnej hodnoty.

Mechanizmus funguje **správne** (AP-001: radšej `unavailable` než vymyslené číslo). Chýba mu vstup.

Spolu s `leads.last_contact_at` (CP-EVIDENCE §4) sú to **tri z ôsmich stĺpcov** `/operator` bez dát.

## 13. Dopad na Guardian

**FAKT.** `guardian_findings` obsahuje `NO_OWNER`, `NO_PHONE`, `HOT_IGNORED` — a **ani jeden `STALE`**.

`memory/decisions.md` (27. 7., v1.1) definuje STALE ako závislé od existencie `lead_events`. Cleanup skript `guardian-v11-cleanup-invalid-stale.sql` v júli zmazal 473 neplatných STALE nálezov (správne — vznikli pod v1.0 fallbackom na `created_at`). Od vtedy **nevznikol ani jeden nový** — a nevznikne, kým je `lead_events` prázdna.

Praktický dôsledok: Strážca dnes nevie oznámiť „tento lead je ticho 7 dní". To je jedno z jadier hodnotovej ponuky Revolisu (`memory/offer.md` → RÝCHLY KONTAKT / RADAR MAKLÉRA).

Poznámka: `rules.ts:63` zavádza v1.2 rovnaké zmäkčenie aj pre `NO_PHONE` — „importované leady bez `lead_events` nie sú NO_PHONE". Pri prázdnej tabuľke to znamená, že **žiadny** lead nie je NO_PHONE, čo sedí s meraním (10 nálezov, **0 otvorených**, najnovší 27. 7.).

## 14. Dopad na CP-P0-1 (Events Spine v2)

Tri veci, ktoré menia zadanie spine:

1. **Potvrdzuje presun na `platform_events`.** `lead_events` nie je kandidát na spine — je to prázdna, funkčne špecifická tabuľka za nepoužitou bránou.
2. **Spine musí pokryť aj chýbajúcu triedu udalostí.** `platform_events` dnes nesie len životný cyklus leadu (`created`, `status_changed`). Reakcia makléra (`call`, `reply`, `email_open`) nie je nikde. Bez nej `reaction24h`, STALE ani „cost / qualified lead" nikdy nebudú mať vstup — nech je spine akokoľvek dobre navrhnutý.
3. **GDPR — nová informácia, mení predchádzajúci záver.** V CP-EVIDENCE som uviedol, že `platform_events` PII neobsahuje, s poznámkou, že `payload` nebol vzorkovaný. Definícia triggera to vyvracia: payload obsahuje **`'name', new.name`**, teda meno leadu. **`platform_events.payload` obsahuje osobné údaje.** `gdpr-advisor` pred CP-P0-1 nie je formalita — je to nutnosť, a týka sa aj cross-tenant čítania founderom.

Navyše: spine postavený na tabuľke, ktorej jediný producent je **nedokumentovaný DB trigger mimo migrácií**, potrebuje ako prvý krok ten trigger zachytiť do migrácie. Inak sa verzuje konzument, nie producent.

---

## 15. Odporúčaná ďalšia akcia

**Nič sa neopravuje bez samostatnej brány.** Podľa hodnoty:

1. **`GO CP-SPEC`** (Control Contract + Events Spine v2) — U1 potvrdil, že kontrakt patrí prvý. `decisions` = 240 open / `exclusivity_outcomes` = 0 a `lead_events` = 0 sú tá istá diera z dvoch strán: systém rozhoduje aj pozoruje, ale nezaznamenáva, čo sa naozaj stalo. Spec musí explicitne pokryť triedu „reakcia makléra".
2. **`GO EVT-TRIGGER-CAPTURE`** (malé, samostatné) — zachytiť `trg_leads_platform_events` + `emit_platform_event` do migrácie. Dnes jediný funkčný event path Revolisu žije len na PROD. Ak sa databáza obnoví z migrácií, event stream zmizne bez varovania.
3. **`GO OPERATOR-HONESTY`** (voliteľné, malé) — `/operator` by mal pri `hasGlobalLeadEvents === false` povedať *„zdroj nepripojený"*, nie zobraziť prázdny stĺpec a ticho odpočítať 4 body zo skóre. Súčasné správanie neporušuje AP-001, ale je menej čestné, než by mohlo byť.
4. **Neodporúčam** opravovať `lead_events` write path samostatne. Bola by to implementácia pred kontraktom — presne to, čomu má poradie CONTRACT → SPINE zabrániť.

---

**Vykonané:** repo read, grep, read-only PROD SELECT. **Nezmenené:** schéma, dáta, env, kód, nasadenie.
**Nenasledovalo:** žiadna oprava, žiadna implementácia, CP-SPEC neotvorený, žiadny merge, žiadny deployment.
