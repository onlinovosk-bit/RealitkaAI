# Seller Trust Factory — Pilot Operating Contract (LANE 18, STF-P0)

**Branch:** `docs/stf-p0-pilot-operating-contract`  
**BASE_SHA (approved for this swarm):** `5d6500106a67a864b049dc372ee0a2d6be793c6f`  
**Gate:** AUTO-SAFE research; obchodné hodnoty a merge = GO REQUIRED  
**Stav:** evidenčný kontrakt. Žiadny paid traffic, live Google call, marketing send, tenant activation, merge, deploy.

Tento súbor **nevymýšľa** numerické prahy, tenant, brokera ani právny základ. Chýbajúca founder odpoveď = `UNKNOWN — HUMAN DECISION`.

Stratégia `revolis-seller-trust-factory-l99.md`, technical addendum a `memory/seller-trust-factory.md` sú **UNAPPROVED DRAFT** (R3). Nie sú SoT.

---

## 1. Inventár Phase 0 (stav 2026-08-13)

| Artefakt | Branch | SHA (GitHub head) | PR | Write-set | Merge |
|---|---|---|---|---|---|
| R2 write-probe | `test/write-probe-stf-p0-20260812` | `91efb5a2e340488c1836688382487e85909f6abf` | [#393](https://github.com/onlinovosk-bit/RealitkaAI/pull/393) | `docs/audit/write-probe-stf-p0.md` | GO REQUIRED |
| L15 legal | `docs/stf-p0-legal-trust` | `51290aa58141886c4115833681cdbff18a011c0b` | [#396](https://github.com/onlinovosk-bit/RealitkaAI/pull/396) | `docs/legal/seller-trust-legal-trust-contract.md` | GO REQUIRED |
| L16 schema | `docs/stf-p0-schema-truth` | `5cfe46b43f8ae3364a912fa8828936d14539df80` | [#394](https://github.com/onlinovosk-bit/RealitkaAI/pull/394) | `docs/architecture/seller-trust-schema-migration-truth.md` | GO REQUIRED |
| L17 events | `docs/stf-p0-event-reliability` | `2407fb208099aa82bf0648e551dc357653ad852c` | [#395](https://github.com/onlinovosk-bit/RealitkaAI/pull/395) | `docs/architecture/seller-trust-event-reliability-contract.md` | GO REQUIRED |
| L18 pilot (tento súbor) | `docs/stf-p0-pilot-operating-contract` | (tento commit) | (tento PR) | `docs/briefs/seller-trust-pilot-operating-contract.md` | GO REQUIRED |

Prienik L15–L18 write-setov je prázdny. Žiadny lane nemení `memory/*`, app kód, testy, migrácie, workflows.

R0 uzavreté: [#382](https://github.com/onlinovosk-bit/RealitkaAI/pull/382) a [#389](https://github.com/onlinovosk-bit/RealitkaAI/pull/389) merged do `BASE_SHA`.

---

## 2. File-overlap matrix (otvorené PR vs budúci STF kód)

| PR | Branch | Prekrytie s budúcim T20–T23 | Rozhodnutie |
|---|---|---|---|
| #393–#396 + tento | STF-P0 docs | žiadne app súbory | merge až G0 |
| #326 | `fix/valuation-widget-e2e-nightly` | `apps/crm/tests/e2e/valuation-widget.spec.ts` | **WATCH** pred T21/T40 |
| — | `codex/seller-calculator-multitenant` | `/odhad/[agencySlug]`, seller-valuation wizard, privacy page, crons | **QUARANTINED** — nemazať, necloseovať, nepoužiť ako SoT |
| billing/credits PRs (#369–#374 a i.) | rôzne | mimo STF write-setov | mimo scope |

Ak `origin/main` driftne pred T10, STOP a prepočítať collision matrix. Žiadny rebase naslepo.

---

## 3. Budúce exkluzívne write manifests (až po G0 — nespúšťať v tomto swarme)

| Task | Exkluzívny scope | Brána |
|---|---|---|
| T01 | Build Order + Integration Report | všetky G0 odpovede |
| T10 | jedna additive migrácia + allowlist + RLS registry + shared contract | L16 truth + founder GO |
| T20 | valuation submit + capture helper | T10 merged |
| T21 | value-first contact UX + tenant privacy/expectation | T10 merged; #382 už resolved |
| T22 | verejný receipt/status/cancel | T10 merged |
| T23 | broker Warm Handoff + outcomes | T10 merged |
| T24 | email magic link / SMS OTP + dispatch | provider/copy/channel GO |
| T30 | bounded drain, retry, DLQ, replay; bez schedulera | T24 merged |
| T40 | E2E/RLS/verification + preview runbook | T20–T30 merged |

T20–T23 paralelne **iba** po merge T10 a opätovnom dôkaze prázdneho prieniku.

Default flag: `seller_trust_pilot_enabled=false`. Zapnutie = osobitný ľudský GO.

---

## 4. Pilotná identita — všetko bez odpovede je UNKNOWN

| Položka | Hodnota | Owner |
|---|---|---|
| Pilotný tenant (agency slug / UUID) | `UNKNOWN — HUMAN DECISION` | Founder |
| Región | `UNKNOWN — HUMAN DECISION` | Founder |
| Verejne identifikovaný broker | `UNKNOWN — HUMAN DECISION` | Founder |
| Backup broker | `UNKNOWN — HUMAN DECISION` | Founder |
| Kanály (email / overený telefón / oba) | `UNKNOWN — HUMAN DECISION` — žiadny kanál nie je implicitný | Founder + L15 counsel |
| Kontaktné okná | `UNKNOWN — HUMAN DECISION` | Founder |
| Broker first-response SLA | `UNKNOWN — HUMAN DECISION` | Founder |
| Denná kapacita (max held / max requestov) | `UNKNOWN — HUMAN DECISION` | Founder + broker |
| Escalation owner | `UNKNOWN — HUMAN DECISION` | Founder |
| Transactional email/SMS provider | `UNKNOWN — HUMAN DECISION` (repo má Resend/Twilio stopy; nie je to GO) | Founder |
| Vlastník outbox drain | `UNKNOWN — HUMAN DECISION` — manuálny concierge vs scheduler | Founder |
| Čo je appointment | `UNKNOWN — HUMAN DECISION` — interná sellerom potvrdená konzultácia **alebo** externý Calendar/Calendly slot (L15 Q11) | Founder + counsel |

**Pravidlo:** kapacita brokera je podmienka trafficu. Bez denného stropu a menovaného brokera ostáva flag OFF. Agent sem žiadne číslo nedoplní.

---

## 5. Business limity — zakázané vymyslieť

| Limit | Hodnota | Owner |
|---|---|---|
| Pilotný budget | `UNKNOWN — HUMAN DECISION` | Founder |
| Trvanie pilota | `UNKNOWN — HUMAN DECISION` | Founder |
| Max cena za verified request | `UNKNOWN — HUMAN DECISION` | Founder |
| Max cena za held consultation | `UNKNOWN — HUMAN DECISION` | Founder |
| Max cena za signed mandate | `UNKNOWN — HUMAN DECISION` | Founder |
| Max complaint / unexpected-contact rate | `UNKNOWN — HUMAN DECISION` | Founder |
| Minimálna vzorka | `UNKNOWN — HUMAN DECISION` | Founder |
| Kill / pause okno | `UNKNOWN — HUMAN DECISION` | Founder |

Bez týchto prahov sa **nesmie** spustiť paid traffic ani označiť pilot za úspešný. L17 už zamkol: business KPI limity ostávajú UNKNOWN; BAWSO ≠ neoverený request.

---

## 6. Incident runbook (poradie je záväzné)

Pri akomkoľvek STOP z briefu §13:

1. **Flag off** — `seller_trust_pilot_enabled=false` (default; ak by bol ON, vypnúť).
2. **Traffic off** — žiadny paid spend, žiadny nový `/odhad` promo, žiadny Ads mutate.
3. **Dispatcher off** — outbox drain zastaviť; nespúšťať retry.
4. **Evidence preserved** — žiadny `DROP TABLE`, žiadne mazanie receipt/event/outbox riadkov, žiadny force-push audit histórie.
5. Founder + escalation owner rozhodnú replay vs dead-letter. Engineering nespúšťa outbound po withdrawal.

Vlastník STOP rozhodnutia v pilote: **Founder** (záloha: `UNKNOWN — HUMAN DECISION`, kým nie je menovaný escalation owner).

---

## 7. Quarantine zoznam (agent nemaže ani necloseuje)

| Vetva / PR | Dôvod | Akcia |
|---|---|---|
| `codex/seller-calculator-multitenant` | Alternatívny `/odhad` widget; prekrytie s T21 | QUARANTINED, kým founder nerozhodne MERGE/CLOSE/KEEP |
| #326 `fix/valuation-widget-e2e-nightly` | e2e valuation spec | WATCH pred T40 |
| Lokálne untracked STF drafty | R3 UNAPPROVED DRAFT | nesmú ísť do tohto PR |

---

## 8. Launch checklist (žiadny checkbox nie je GO)

Pred HUMAN LAUNCH GATE musí platiť:

- [ ] G0 odpovede 1–10 z overnight briefu sú vyplnené (nie `UNKNOWN`)
- [ ] L15 counsel memo na 20 otázok existuje a nie je falošný sign-off
- [ ] L16 linked `migration list` už nie je STOP, alebo founder vedome odložil genome opravu
- [ ] T10 migrácia merged; allowlist + RLS registry obsahujú nové tabuľky
- [ ] 100 % routed opportunities má immutable evidence účelu, kanála, recipienta, expectation
- [ ] outbound po withdrawal = 0
- [ ] jeden tenant/idempotency key = jeden lead + jeden outbox effect
- [ ] cross-tenant read/write/FK mismatch = 0
- [ ] žiadne GA/optional cookie/AI pred schváleným notice
- [ ] serverový ledger je autorita; GA4 iba destination
- [ ] Google wrapper podporovaná verzia, Google host, read-only; test child overený serverom
- [ ] `seller_trust_pilot_enabled=false` kým founder nezapne
- [ ] CI, local reset, linked parity, preview acceptance green
- [ ] merge, deploy, produkčná migrácia, secrets, spend majú **osobitný** ľudský GO

---

## 9. Vlastník každého STOP rozhodnutia

| STOP | Kto smie povedať STOP | Kto smie povedať GO znova |
|---|---|---|
| Neočakávaný kontakt / sťažnosť | Founder (okamžite) | Founder + counsel |
| Outbound bez evidence / po withdrawal | On-call drain owner (kým UNKNOWN: nikto nesmie drainúť) | Founder |
| Cross-tenant leak | Engineering lead + Founder | Founder |
| Duplicate routing / stratený outbox | Drain owner + Founder | Founder |
| Cookie/AI pred notice | Founder + counsel | Counsel memo + Founder |
| Secret v logu / credential na iný host | Engineering lead | Founder |
| Google Ads mutate v Stage 0 | Ktokoľvek v lane — hard STOP | Founder |
| MCC ako client customer_id | Engineering — hard STOP | Founder |
| Migration drift | L16 owner / integrator | Founder po linked dôkaze |
| Označenie neovereného requestu za BAWSO | Product — hard STOP | Founder po L17 kontrakte |
| Agent začne S0.4/S0.5/nurture/paid traffic pred G0 | Orchestrátor — hard STOP | Founder novým swarm GO |

---

## 10. Čo tento lane výslovne nespúšťa

- runtime kód, SQL, secrets do Vercelu, live Google Ads call
- merge #393–#396
- oponentské kolo (spúšťa orchestrátor až po tomto PR)
- implementačný DAG T01+

**Ďalší GO owner:** Founder — (a) vyplniť tabuľky §4–§5, (b) L18 merge po oponentoch, (c) samostatné GO na Kolo B oponentov ak ešte nebeží.