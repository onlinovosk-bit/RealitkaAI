# Sprievodca V0 — uzavretie 4 dier (nie nový wizard)

**Branch:** `feat/sprievodca-v0`  
**Base:** `main` @ `eeba38a` (#521)  
**Dátum:** 2026-09-04  
**Merge:** NIKDY agentom — PR, merguje founder.

## Čo sa zmenilo

Existujúci tok `buyer-onboarding` → `nehnutelnosti` ostáva. Žiadny nový wizard/chatbot/LLM.

| ID | Diera | Fix |
|----|--------|-----|
| T1 | Lead zo sprievodcu nedostane odpoveď | `void runInboundLeadAutoResponse(...)` po úspešnom leadi; `notifyNewBuyerLead` ponechaný |
| T2 | AP-001 `rooms: "2 izby"` | `rooms: ""`; UI nezobrazí prázdny badge |
| T3 | Filter zahadzuje Neznáme | Sekcia *Ďalšie nehnuteľnosti, ktoré sme zatiaľ nezaradili* + label *Typ zatiaľ neurčený* cez `isRealviaMappingUnknown` |
| T4 | Agency scope | Nález nižšie — tenant routing nemením |

## T2 — ďalšie polia v inserte, ktoré wizard nepýta (alebo skresľuje)

| Pole | Hodnota | Poznámka |
|------|---------|----------|
| `rooms` | ~~`"2 izby"`~~ → `""` | **opravené** |
| `financing` | `"Hypotéka"` / `"Hotovosť"` | Checkbox `needsMortgageHelp` — unchecked ⇒ Hotovosť (môže byť skreslenie) |
| `timeline` | `"Ihneď"` / `"Do 3 mesiacov"` / `"Do 6 mesiacov"` | Horizont `6-12` mapuje na „Do 6 mesiacov“ — skreslenie |
| `assigned_agent` | `"Nepriradený"` | Systémový default |
| `status` | `"Nový"` | Systémový default |
| `last_contact` | `"Práve vytvorený"` | Systémový default |
| `score` / `buyer_readiness_score` | computed | OK (nie inventovaná skutočnosť klienta) |
| `client_segment` | derived | OK (odvodené pravidlá) |
| `property_type` | zo wizardu (SK) | OK |
| `source` | `"Buyer onboarding"` | OK |

## T3 — koľko zo 133 spadne do neznámej sekcie

Prod SELECT 2026-09-04 (po #513/#520, **bez** property backfillu):

| Metrika | n |
|---------|---|
| `properties` total | 133 |
| `type = 'Neznáme'` OR `transaction_type = 'Neznáme'` | **0** |
| `type = 'Ostatné'` (starý fog) | 86 |
| `type = 'Byt'` | 31 |
| `type = 'Dom'` | 16 |

**Po tejto zmene:** **0 / 133** do neznámej sekcie (sekcia je pripravená; nové Realvia syncy zapisujú `Neznáme`).

`Ostatné` **nie je** v neznámej sekcii — `isRealviaMappingUnknown` je len sentinel `Neznáme` (zákaz hádania / fogovania). Cesta B (maklér confirm #514) alebo číselník Realvie odblokuje Sprievodcu úplne.

## T4 — Agency scope (nález, bez opravy tenant routingu)

### `agencyId` v `buyer-onboarding/actions.ts`

```ts
process.env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() || SMOLKO_AGENCY_ID
// SMOLKO_AGENCY_ID = "11111111-1111-1111-1111-111111111111"
```

Vzor ako `DEFAULT_AGENCY_ID` v register — **hardcoded fallback na Smolko**. V tomto PR **neopravujem** (vlastné rozhodnutie foundera).

### Verejný výpis `(public)/nehnutelnosti`

**Pred:** volal `listProperties()` bez session → `resolveSessionAgencyId` chýba → v prod **prázdna sada** (fail-closed, nie leak medzi tenantmi). `createAdminClient()` sa používal len na `buyer_intents`.

**Po (nutné pre T3 + verejný tok):** `createAdminClient()` + **explicitné** `.eq("agency_id", resolvePublicListingAgencyId())` — rovnaký env/Smolko resolver ako sprievodca. RLS sa nespolieha. Žiadna zmena multi-tenant routingu — len správny pattern pre verejnú stránku.

## Overené

- Unit: buyer-onboarding auto-response + rooms; partition helper
- Zakázané: nový wizard, title inference, `map-taxonomy` zmena, properties backfill, outbound mimo T1 auto-response

## Mimo tohto PR

- Realvia backfill / číselník
- Cesta B: maklér potvrdenie Neznáme cez Launch Pack (#514)
- Tenant routing mimo Smolko env fallback
