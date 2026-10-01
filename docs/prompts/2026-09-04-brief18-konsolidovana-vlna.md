# REVOLIS.AI — BRIEF 18 · KONSOLIDOVANÁ VLNA
# 2026-09-04 · 8 vĺn (V1–V8) · 1 orchestrátor
# Zlučuje všetku rozpracovanú prácu z 3.–4. 9. 2026 do jedného behu.
# ════════════════════════════════════════════════════════════════

## ⚠️ DVE VECI, KTORÉ SWARM NEROBÍ

Toto sú brány foundera. Vlny na ne nečakajú okrem V8.

**G1 — správa Smolkovi.** Realvia webhook mlčí od 28. 8. Bez odpovede nevieme,
či je mŕtvy alebo je len pokojný týždeň. Žiadna vlna to nezistí.

**G2 — merge dvoch hotových PR:** `feat/hladame-verejne-dopyty`
a `fix/inbound-lead-no-invented-criteria`. **V8 bez prvého nesmie začať.**

---

## STAV (overené v produkcii 2026-09-04)

```
main                     2a851a6
migrácie                 100 v repe · 48 aplikovaných · 27 voľných .sql mimo migrations/
anon politiky            1 otvorená (onboarding_sessions) — ostatných 14 zrušených
brain registry           28 dokumentov (cieľ 60–80)

realvia webhook          posledný 28.8. · za 24 h: 0
routine_notifications    143 · neprečítaných 143
leads                    504 · odpovedaných 0 · všetky "Nový"
buyer_intents            3
lead_property_matches    0
properties               132 · Ostatné 0 · Neznáme 0 ✓
```

## GLOBÁLNE PRAVIDLÁ

```
NIKDY nemergi do main. PR áno, merge robí founder.
NIKDY DDL / migrácia / db push do produkcie. Migrácia = SÚBOR, neaplikovaný.
NIKDY auto-send navonok. Draft áno, odoslanie nikdy.
NIKDY nevymýšľaj údaj, ktorý v dátach nie je (AP-001, AP-005).
Done = ARTEFAKT: commit + vetva + zelené CI. Text nie je done (AP-009).
PRI NEJASNOSTI → otázka do .ai/bus/inbox/, pokračuj ďalšou úlohou. NEHÁDAJ.

POVINNÉ V KAŽDOM PR — sekcia „Najprv som hľadal":
  čo si hľadal v docs/, migrations/, lib/ a čo si našiel.
  Za dva dni sme deväťkrát stavali niečo, čo už existovalo.
```

---

## ⛔ FÁZA 0 — dve brány, obe blokujúce

### 0a — write-probe
Vetva `test/write-probe-b18`, riadok do `docs/audit/write-probe.md`, commit, push.
Over `git ls-remote --heads origin | grep write-probe-b18`.
Nie je tam → **STOP celej vlny.** Nemergovať.

### 0b — Ruflo
`.mcp.json` má `ruflo@latest` — nepinovaná verzia. `swarm_init` zlyhal pri
posledných dvoch behoch a orchestrátor prešiel na izolované worktree.

Skús `swarm_init` **raz**. Ak zlyhá:
1. zapíš presnú chybu do `.ai/bus/outbox/`
2. **pokračuj cez izolované worktree** — vlny B16 tak dobehli všetky
3. neopakuj pokus, nepíš workaround

Toto nie je dôvod zastaviť beh. Je to dôvod prestať predstierať, že Ruflo beží.

---

## MAPA VĹN — scope sa nekríži ani jedným súborom

| Vlna | Vetva | Exkluzívny scope |
|---|---|---|
| V1 | `security/b18-onboarding-sessions-rls` | migrácia + `(public)/onboarding*`, `lib/onboarding*` |
| V2 | `feat/b18-notification-delivery` | `lib/infra/**`, `app/api/cron/notification-digest/**`, `apps/crm/vercel.json` |
| V3 | `docs/b18-migration-drift` | `docs/audit/**` |
| V4 | `fix/b18-matching-guards` | `lib/matching.ts` + testy |
| V5 | `chore/b18-dead-leads` | `lib/leads/dead-lead-rule.ts`, `scripts/close-dead-leads.ts` |
| V6 | `docs/b18-governance-audit` | `docs/reports/**` |
| V7 | `chore/b18-knowledge-index` | `docs/INDEX.md`, `docs/templates/**`, `scripts/build-docs-index.ts`, `CLAUDE.md`, `brain/src/catalog.ts` |
| V8 | `feat/b18-dopyt-to-buyer-intent` | `scripts/**`, `(dashboard)/dopyty/**`, `lib/demand/**` |

Pred prvým commitom: `git diff --name-only origin/main...HEAD` a over scope.
Súbor mimo → revert a hlás.

**V1–V7 paralelne. V8 až po merge `feat/hladame-verejne-dopyty` (G2).**

---

## V1 — onboarding_sessions: posledná otvorená diera

Zadanie už existuje: **`.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`.** Prečítaj
ho a drž sa ho.

Kontext: `Allow anon access` (ALL, bez podmienky) nad 5 riadkami `form_data`.
Ktokoľvek ich vie čítať **aj mazať**. Je to jediná zvyšná anon politika v celej
schéme. Scopovať cez `session_id`, ktorý browser sync aj tak posiela.

Migrácia = súbor, **NEAPLIKOVANÁ**. Rollback runbook povinný — rovnaký vzor
ako `docs/runbooks/rollback-anon-policies.md`.

**Pridaj do PR nález** (neopravuj tu): `app/api/automation/rules/[id]/route.ts:19`
robí `.select("agency_id")` na `lead_assignment_rules`, ktorá ten stĺpec nemá.
V produkcii to vracia `42703`. Patrí to k V3.

---

## V2 — doručenie alarmov (najvyššia hodnota v tejto vlne)

Zadanie: `docs/prompts/task-strazca-pritoku.md` (ak ho v repe niet, je v prílohe
foundera — vypýtaj si ho cez inbox).

Zhrnutie: heartbeat **funguje** a 4. 9. o 07:53 zahlásil
„Realvia/webhook: žiadna stopa 7+ dní". Zapísal to do `routine_notifications`.
**143 notifikácií, 0 prečítaných.** Chýba doručovacia cesta.

```
platform-heartbeat  →  routine_notifications  →  ✖ NIKAM
guardian digest     →  guardian_findings      →  e-mail ✓
```

Tri veci: denný digest neprečítaných e-mailom, `critical` okamžite (dedup 24 h
cez existujúce dáta, **žiadny nový stĺpec**), a prah pre Realvia signál
48 h warning / 7 dní critical + odstrániť väzbu na `inboundMailboxCount`.

---

## V3 — migračný drift (najväčší jednorazový nález)

```
100 migračných súborov v repe
 48 aplikovaných v produkcii
 27 voľných .sql mimo priečinka migrations/
```

**52 migrácií nikdy nebežalo.** Už poznáme tri dôsledky:
`ai_action_audit.cost_eur` (tichý pád od 11. 6.), `ai_generations` a `ai_cost_daily`
(neexistujú), `lead_assignment_rules.agency_id` (kód selectuje neexistujúci stĺpec).

**Výstup:** `docs/audit/2026-09-04-migration-drift.md`

Pre každú neaplikovanú migráciu: čo pridáva · existuje kód, ktorý to používa ·
dôkaz `súbor:riadok` · verdikt `TICHÉ ZLYHANIE | MŔTVA | NEAKTÍVNA | NEJASNÉ`.
Päť najhorších na začiatok.

Zoznam aplikovaných verzií **si vypýtaj od foundera** cez inbox — nemáš prístup
do produkcie. Dotaz:
`select version from supabase_migrations.schema_migrations order by version;`

**Žiadnu migráciu neaplikuj ani nemaž.**

---

## V4 — guardy párovacieho engine

`lib/matching.ts`, `calculateLeadPropertyMatch`:

```ts
if (normalize(lead.propertyType) === normalize(property.type)) { score += 25; }
```

Prázdne = prázdne → **+25 a text „typ nehnuteľnosti sedí"**. A 439 leadov má
`property_type = ''`. Keď sa párovanie zapne, bude tvrdiť zhodu tam, kde nepozná
ani jeden typ.

Prejdi **celý** súbor, nájdi každé miesto, kde prázdna hodnota môže skórovať
alebo vygenerovať dôvod. Pravidlo: **prázdne nikdy neskóruje.** Pridaj do výsledku
počet reálne porovnaných kritérií.

**NEMEŇ váhy ani prahy** — to je produktové rozhodnutie.
**NESPÚŠŤAJ `recalculateAllMatches()`.**

---

## V5 — mŕtve leady

Neexistuje **ani jeden** záznam o pokuse kontaktovať lead: `activities` má 187
riadkov za celú históriu, z toho 1 telefonát; `leads.last_contact` je prázdny
pri 439 zo 448.

Preto pravidlo **nesmie** znieť „neodpovedal po N pokusoch". Musí znieť:

```
created_at > 90 dní
AND auto_response_sent_at IS NULL
AND žiadny riadok v activities
AND status = 'Nový'
AND source = 'realvia_import_smolko'
→ closure_reason_code = NO_RECORDED_CONTACT_90D
```

Text pre makléra musí hovoriť pravdu o **nás**, nie o klientovi:
> „Za 94 dní žiadny zaznamenaný kontakt z našej strany. Nevieme, či má klient
> ešte záujem."

**ZAKÁZANÉ:** „klient neprejavil záujem" (AP-005). Mazanie leadov. Rozlúčkové
e-maily. Skript `--dry-run` predvolene, `--agency-id` povinný, agent nespúšťa.

---

## V6 — governance audit

**6A — junk v produkčnej schéme (AP-008).** Tabuľky mimo migrácií:
`"AI AGENT AUTOMAT ONBOARDING"`, `"AI AGENT AUTOMAT ONBOARDING no.2.01"`,
`"gpmmfashion@gmail.com tabulka"`. Plus 27 voľných `.sql` mimo `migrations/` —
práve nimi sa do produkcie dostali `demo_*` politiky.

Zisti staticky: čo má DDL prístup do produkcie mimo migrácií? Prehľadaj
`automation/`, `scripts/`, `.ruflo/`, n8n konfigurácie, všetko so service-role kľúčom.
**Nemaž nič.** Výstup je nález + odporúčanie.

**6B — 436 vetiev.** Roztrieď: zmergované · nezmergované s commitmi · prázdne.
**Nič nemaž.**

---

## V7 — dokončenie znalostnej hygieny

PR #532 priniesol `MAPA.md`, sekcie vaultu a registry 24 → **28**. Chýba:

1. **`docs/INDEX.md`** generovaný cez `scripts/build-docs-index.ts` — súbor, dátum,
   prvý odstavec, a **či naň niečo v repe odkazuje**. Dokument bez odkazov =
   kandidát na `docs/archive/` (len označiť, **nepresúvať**).
2. **`docs/templates/task-template.md`** so sekciou „Najprv som hľadal".
3. **To isté pravidlo do `CLAUDE.md`** — dnes tam nie je (0 výskytov).
4. **Registry 28 → 60–80**: pridaj `docs/architecture/**`, `brain/lessons/**`,
   `memory/*.md`, `docs/audit/**`. **Nepridávaj** `docs/reports` (76),
   `docs/briefs` (74), `docs/prompts` (45) — `ENGINE.md` hovorí sám:
   *„Brain OS nie je sklad ďalších stoviek strán."*

---

## V8 — dopyt → buyer_intent (až po G2)

Zadanie: `docs/prompts/2026-09-04-hladame-a-dopyty.md`, sekcia **PR C**.
Prečítaj a drž sa ho doslovne.

11 dopytov → lead + `buyer_intent`. `primary_city = ''` — mesto je len v titulku
a **neparsuje sa**. `budget_max = 0` pri `price = 0`. Plus obrazovka
`(dashboard)/dopyty`, kde maklér doplní mesto a rozpočet — a **vidí, koľko zhôd
tým pribudne.**

Skript `--dry-run`, `--agency-id` povinný, agent nespúšťa.

---

## ORCHESTRÁTOR

1. Fáza 0a. Zlyhá → STOP. Fáza 0b zlyhá → pokračuj cez worktree.
2. V1–V7 paralelne. V8 až po G2.
3. Kolízna kontrola scope pred prvým commitom každej vlny.
4. Zaseknutá vlna → otázka do `.ai/bus/inbox/`, pokračuje ďalšou úlohou.
   **Jedna vlna nezastavuje ostatné.**
5. Priebežný report každých 90 minút do `.ai/bus/outbox/`.
6. Záver: `.ai/bus/outbox/MSG-20260904-190-orch-b18-result.md`.

```
VLNA │ VETVA │ PR │ CI │ SÚBORY MIMO SCOPE │ OTÁZKY │ STAV
```
`STAV`: `ARTEFAKT` · `ČAKÁ NA ODPOVEĎ` · `NEDOKONČENÉ` · `ZASTAVENÉ`.
Žiadne „hotovo" bez git dôkazu.

---

## KONTROLNÝ DOTAZ NA ZÁVER

```sql
select
  (select count(*) filter (where read_at is null) from routine_notifications) as neprecitane_alerty,
  (select max(received_at)::date from realvia_webhook_logs)                   as posledny_webhook,
  (select count(*) from leads where auto_response_sent_at is not null)        as odpovedane,
  (select count(*) from buyer_intents)                                        as dopyty_s_kriteriami;
```

Dnes: `143 · 2026-08-28 · 0 · 3`.

Po V2 musí prvé číslo klesnúť. Po V8 musí štvrté stúpnuť.
Druhé a tretie **nezávisia od swarmu** — závisia od G1 a od toho, či niekto
so systémom začne pracovať. **To je celý zmysel tejto vlny.**

---

## ČO SA NESTAVIA

```
spustenie párovania a cron daily-match     (V4 ho len pripravuje)
aplikovanie akejkoľvek migrácie            (V1, V3 ich len pripravujú)
mazanie vetiev, tabuliek, leadov, dokumentov
Daily One runtime                          (čaká na GO IMPLEMENT DAILY ONE V0)
Growth Intelligence, Model Routing         (parked — P-GI, P-MR)
chatbot, nový dashboard, nový modul
```
