# Build Package — Property Launch Pack V0 (Reality Smolko)

**Cieľová cesta:** `docs/briefs/build-package-property-launch-pack-v0.md`  
**Brief / BO:** `docs/briefs/BO-property-launch-pack-v0.md`  
**Premortem:** `docs/premortems/2026-09-03-property-launch-pack-v0.md`  
**Plan:** `docs/briefs/plans/BO-property-launch-pack-v0-plan.md`  
**Integration Report:** `docs/reports/2026-09-03-property-launch-pack-integration.md`  
**Šablóna:** `docs/templates/build-package.md`  
**Baseline:** `origin/main` @ `b746865427428a084fd505c5f59d0af9d540585e`  
**GO:** vyžaduje `GO IMPLEMENT PROPERTY LAUNCH PACK V0` (zatiaľ **neudelené**)

---

## 1. VISION & BUSINESS

Maklér Reality Smolko potrebuje pri novej ponuke **jeden schválený balík textov a podkladov** na viac kanálov, nie dva oddelené tooly. User story: *Ako maklér Smolko vyberiem / doplním 1 ponuku, dostanem Guardianom skontrolovaný portal+FB+IG+email pack a stiahnem ho do 20 minút — bez toho, aby systém sám čokoľvek publikoval.*

---

## 2. SPEC

1. Kanonický adapter: `RealviaPropertyRow | PropertyInput` → `PropertyLaunchFacts` (žiadne vymyslené polia).
2. Generácia kanálov: reuse `generateListingContent` (povinné kľúče ListingContent).
3. Pack artefakty: reuse `buildVerticalPackDemo` (alebo rovnaké capability volania) na Realvia nohe; na manuálnej nohe — kanály + completeness ak facts stačia, bez falošného Realvia `source_id`.
4. Pred stavom `approved_for_export`: `reviewGeneratedListing` musí `ok` (alebo explicitný maklér override **s audit dôvodom** — default off v V0 = **žiadny override**).
5. Export: JSON/ZIP allowlist; **zakázané** `payload_raw`, broker PII nad rámec verejného listing textu.
6. Publish: žiadny write do `portal_listings`; microsite `publishBlocked`; `assertPublishAllowed` ostáva.
7. Feature flag `PROPERTY_LAUNCH_PACK_V0` (názov finálny v implementačnom PR) default **false**.
8. Pilot: 5 ponúk; metrika ≤20 min / schválený pack; evidence report.
9. **Žiadna nová DB tabuľka.** Voliteľný apply existujúcej `ai_generations` = iný founder GO.
10. **Žiadny verejný chatbot.**

Nefunkčné: tenant izolácia agency_id; rate-limit ako pri listing-content; latency generácie meraná v audite.

---

## 3. ARCHITECTURE

```
[Manuálny formulár]──┐
                     ├──► PropertyLaunchFacts ──► generateListingContent ──┐
[properties row]─────┘         │                                         │
                               ├──► vertical-pack capabilities (opt)     ├──► Quality Guardian
                               └─────────────────────────────────────────┘         │
                                                                                    ▼
                                                                          approved_for_export
                                                                                    │
                                                                          download JSON/ZIP
                                                                          (+ optional ai_action_audit)
```

| Integrácia | Cesta |
|---|---|
| KF1 | `apps/crm/src/lib/ai/listing-content.ts` |
| KF1 API (existujúce) | `apps/crm/src/app/api/ai/listing-content/route.ts` |
| Realvia adapter | `apps/crm/src/lib/capabilities/_shared/realvia-property-row.ts` |
| Guardian | `apps/crm/src/lib/capabilities/quality-guardian/review.ts` |
| Pack | `apps/crm/src/lib/capabilities/vertical-pack-demo/build.ts` |
| Publish gate | `apps/crm/src/lib/capabilities/_shared/human-approval.ts` |
| Nový orchestrátor (po GO) | `apps/crm/src/lib/capabilities/property-launch-pack/` (názov) |

**Scheduler:** žiadny cron. On-demand UI/API.

---

## 4. DATA

**Žiadna nová schéma. Žiadny MIGRATION.sql v tomto balíku.**

| Tabuľka | Prod (3. 9. 2026) | V0 použitie |
|---|---|---|
| `properties` | 133 / 132 Smolko | read |
| `ai_action_audit` | 30 | optional audit event |
| `ai_generations` | **neexistuje** | neblockovať V0; download-first |
| `portal_listings` | 0 | **nepísať** |

Prod inventory limity (príloha + re-count): Predaná **0**; Ostatné **63–65 %**; cena prázdna 41; area 0 → 50 — pilot musí filtrovať / manuálne dopĺňať.

---

## 5. API/UI

Po implementačnom GO (návrh kontraktu, nie kód teraz):

- `POST /api/.../property-launch-pack` — agency session; body: `sourceId` **alebo** `property` (PropertyInput); response: draft + guardian + pack meta.
- `POST .../approve-export` — len ak guardian.ok; vráti download payload.
- UI: jedna obrazovka v existujúcom dashboard vzore (nie nový marketing surface).

Existujúce `/api/ai/listing-content` **nemaže** — V0 ho môže interne volať alebo zdieľať lib.

---

## 6. TESTING & ACCEPTANCE

- Unit: adapter, guardian wire, export allowlist.
- Verification: `property-launch-pack-v0.verification.test.ts`.
- Fixture: `REALVIA_SMOLKO_13303557`.
- DoD: CI lint/test/build; flag off; 0 portal writes; premortem ≥6 mitigované; docs report s 5× stopkami po pilote.
- **Bez PROD migrácie** v tomto PR.

---

## 7. PREMORTEM

`docs/premortems/2026-09-03-property-launch-pack-v0.md` — skóre 9/6 riziká #1–#6 povinné v pláne.

---

## 8. ROLLBACK

1. Flag off.  
2. Revert PR.  
3. DB: nič.  
4. KF1 a capabilities knižnice ostávajú.

---

## 9. MONITORING

- Audit riadok / log: agency_id, source_id|manual, guardian.ok, latencyMs, export yes/no.  
- Po pilote: manuálny report 5× čas.  
- Žiadny nový cron heartbeat.

---

## 10. MEMORY UPDATE (po merge implementácie)

- `memory/decisions.md`: BUILD Launch Pack V0 — jeden vstup, jeden Guardian, no new DB, no publish.  
- Review dátum: +14 dní po Smolko pilote (používa / nepoužíva).

---

## 11. RELEASE CHECKLIST

1. Founder `GO IMPLEMENT PROPERTY LAUNCH PACK V0`.  
2. Implementačný PR (1 logická zmena) + Preview.  
3. CI zelené + verification.  
4. Founder merge.  
5. Flag on len pre Smolko tenant (alebo manuálny enable).  
6. Pilot 5 + report.  
7. **Nespúšťať** `ai_generations` apply ani `mapCategory` fix v tom istom PR.

---

## ODCHÝLKY / POZNÁMKY

1. Brief 63 % Ostatné (83) vs re-count 65 % (86) — oba validné; koreň = adapter.  
2. `human-approval` Map nie je CRM store — V0 schválenie = export gate, nie durable workflow (Action Center rieši iný BO).  
3. Wave 1 listing-generator ostáva template; **kanály** idú z KF1 — zámerne, nie duplicitný LLM.
