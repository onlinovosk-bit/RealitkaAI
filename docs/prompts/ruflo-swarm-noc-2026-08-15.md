# RUFLO SWARM — NOČNÁ VLNA N1+N2 (15.→16.8.2026)

**Cieľová cesta:** `docs/prompts/ruflo-swarm-noc-2026-08-15.md`
*(repo = Obsidian vault; táto nota je MOC nočného behu. Wiki-linky fungujú
v Obsidiane aj ako text na GitHube.)*

**Režim (nemenný):** vetva + PR + STOP. **ŽIADNY MERGE, ŽIADNY PUSH DO MAIN,
ŽIADNE CREDENTIALS, ŽIADNY ZÁSAH DO PROD DB.** Merge robí výhradne founder ráno.
Pravidlá: [[CONSTITUTION]] (soft 400 / hard 600 riadkov na PR) · T10 ·
D-2026-08-13-01 · D-2026-08-17-01/02 · D-2026-08-15-02/03 v [[decisions]].

---

## VSTUPNÁ BRÁNA — každý lane pred štartom

```
git fetch origin && git log --oneline origin/main -5
```

Podmienka pre všetky lanes: na origin/main je `b4e9475` (#417 Stage 0 PASS)
a `d6b9e35` (#416 perf fix). Ak nie → lane sa NESPÚŠŤA, zapíš report.

L23 a L24 navyše: D-2026-08-17-01 a D-2026-08-17-02 sú v `memory/decisions.md`
na maine (✅ boli mergnuté v #411 — over grepom).

## Nočné pravidlá NAVYŠE (platia pre všetky lanes)

1. **Nikto nepíše do `memory/`** — ani session-summary, ani decisions.
   Súhrn noci píše výhradne orchestrátor do
   `docs/reports/2026-08-16-nocna-vlna-report.md` (jediný súbor, jediný autor).
2. **Jeden push na lane** keď je PR hotový — žiadne slučky push/amend
   (každý push spúšťa Vercel preview build).
3. Konflikt, nejasný design, nesplniteľné zadanie → **REPORT, nie improvizácia.**
4. Žiadny lane nesiaha na súbory iného lane (tabuľka nižšie je záväzná).
5. Embedded browser agenta: **žiadne akcie na GitHub/Vercel UI.** Všetko cez git+CLI.

---

## VLNA N1 — kód (spustiť hneď, 4 lanes paralelne)

### Dôkaz neprekrytia

| Lane | Zapisuje výhradne do | Migrácia |
|---|---|---|
| **L22** V4-B DMARC impl | `apps/crm/src/lib/inbound/**` (NOVÉ) · `apps/crm/src/app/api/inbound/**` (NOVÉ) + testy tamtiež | nie |
| **L23** decisions dedup (Variant A) | `brain/**` · `scripts/` súbory brain:ingest · CI kroky týkajúce sa brain | nie |
| **L24** genome_layer2 RENAME | `supabase/migrations/2026*_rename_genome_layer2.sql` (NOVÝ, NEAPLIKOVAŤ) · výhradne kódové referencie na genome_layer2 | súbor áno, aplikácia NIE |
| **L25** pagination perf | `apps/crm/src/app/(dashboard)/dashboard/**` · `.../leads/**` + ich data-fetch/store súbory | nie |

**L22 — V4-B implementácia (mock-first), vetva `feat/inbound-gmail-pull`:**
Podľa merged designu [[2026-08-15-v4-b-dmarc-oauth-pull]]. Gmail API pull
namiesto forwardu: klient s OAuth refresh-token flow (token z env, NIKDY
v repe), mapovanie na `inbound_mailboxes` → `POST /api/acquire/email` pipeline.
Všetko mock-first: testy s nahratými Gmail API odpoveďami (vrátane DMARC
p=REJECT prípadu, ktorý dnes padá). Env kontrakt do `.env.example`
(prázdne hodnoty). ZAKÁZANÉ: živé Google volanie, Cloudflare zmeny, deploy,
akýkoľvek reálny email. Výstup: kód + testy + `docs/runbooks/gmail-pull-setup.md`
(klikací návod pre foundera: OAuth consent, scope, kam vložiť token). STOP.

**L23 — decisions dedup Variant A (D-2026-08-17-01), vetva `chore/decisions-dedup-variant-a`:**
`memory/decisions.md` = jediný zdroj pravdy. brain:ingest číta z neho,
`brain/decisions/decisions.md` prestáva existovať ako ručný duplikát
(zmaž alebo zmeň na generovaný pohľad podľa auditu [[decisions-dedup-audit]]).
Uprav CI check, ktorý naň odkazuje. T10 platí: žiadny baseline refresh
pri prázdnom diffe zdrojov. Testy/CI zelené.

**L24 — genome_layer2 RENAME (D-2026-08-17-01), vetva `chore/genome-layer2-rename`:**
Podľa auditu [[genome-layer2-audit]]: vytvor migračný SÚBOR s RENAME
+ uprav všetky kódové referencie. **Migráciu NEAPLIKUJ — prod história je
v drifte (46/94), `db push` = ZAKÁZANÝ.** Do PR popisu vlož presný postup
pre foundera: Dashboard SQL editor + INSERT do
`supabase_migrations.schema_migrations` (vzor z 20260811220000). Testy zelené
s tým, že kód znesie starý aj nový názov do aplikácie migrácie (feature-detect
alebo poznámka, čo sa smie mergovať až po aplikácii).

**L25 — pagination /dashboard + /leads, vetva `fix/crm-lists-pagination`:**
Nadväzuje na #416 (layout už inventáre nenačítava — NEDOTÝKAJ sa layoutu
ani navigácie). Vlastné dáta stránok: nahraď `limit=500` + `select=*`
stránkovaním (server-side limit ~50 + načítanie ďalších na vyžiadanie)
a užším selectom len potrebných stĺpcov. Žiadna zmena RLS/auth/zobrazenej
funkcionality. Meranie: lokálne pred/po do PR popisu. Cieľ: T2 < 2 s.

---

## VLNA N2 — docs + testy (paralelne s N1, disjunktné)

### Dôkaz neprekrytia

| Lane | Zapisuje výhradne do |
|---|---|
| **L26** Stage 1 plán (draft) | `docs/architecture/stage1-plan-draft-2026-08.md` (NOVÝ) |
| **L27** persistencia sync dát | `supabase/migrations/2026*_acquisition_sync_tables.sql` (NOVÝ, NEAPLIKOVAŤ) · `apps/crm/src/lib/acquisition/sync/persist/**` (NOVÝ podadresár) + testy tamtiež |
| **L28** Playwright e2e /acquisition | `apps/crm/e2e/**` (NOVÝ spec) |
| **L29** komunikačné drafty | `docs/sales/smolko-status-2026-08-15.md` (NOVÝ) · `docs/sales/realitna-unia-pripomienka-draft.md` (NOVÝ) |

**L26 — Stage 1 planning doc (docs-only, vetva `docs/stage1-plan-draft`):**
Návrh, NIE spustenie — Stage 1 má vlastné GO foundera. Obsah: cieľ (prvá
reálna RK, malý budget, lead loop), scope vs. non-scope, Basic access
žiadosť (načasovanie + podklady), `google_key` z query-stringu → header/body,
nový webhook kľúč (smoke-kľúč sa NIKDY znovu nepoužije — D-poznámka 15.8.),
persistencia (nadväznosť na L27), UNIQUE(agency_id,id) na leads (odložené
zo Stage 0 ZISTI), rozpočet, kill kritérium ako mal Stage 0, riziká.
Otvorené otázky pre foundera explicitne v sekcii na konci.

**L27 — persistencia ad groups/keywords/search terms/metrics
(vetva `feat/acquisition-sync-persistence-prep`):**
Diera priznaná v PASS reporte. Migračný SÚBOR: 4 tabuľky podľa vzoru
`acquisition_campaigns` (composite FK (agency_id, …), RLS `*_tenant` policies,
UNIQUE na provider ID). **NEAPLIKOVAŤ na prod** — rovnaký postup pre foundera
ako L24. Upsert vrstva v `sync/persist/**` za feature-flagom
(`ACQUISITION_PERSIST_SYNC=false` default), workery sa jej bez flagu nedotknú.
Testy nad mock DB. PR popis: čo sa smie zapnúť až po aplikácii migrácie.

**L28 — Playwright e2e smoke (vetva `test/acquisition-e2e-smoke`):**
V #416 test-plane ostal nezaškrtnutý „Preview smoke". Sprav e2e spec:
login test užívateľom (lokálny seed/mock, NIKDY reálne credentials),
`/acquisition` render < 15 s, viditeľné: účet 7024414113, 2 kampane PAUSED,
3 eventy LOGGED_TEST, a NEGATÍVNY test: iný tenant tie dáta nevidí.
Beží lokálne/CI; žiadny beh proti produkcii.

**L29 — komunikačné drafty (docs-only, vetva `docs/comms-drafts-2026-08-15`):**
1. **Smolko status:** ľudský, stručný — čo je s emailami (prečo 2 newslettre
   nedošli, že fix je vo výrobe s termínom tento týždeň), pripomenutie 3
   prepísaných inzerátov, 1 konkrétny ďalší krok. Podklad [[smolko-status-2026-08-10]].
2. **Realitná únia (Plavec):** zdvorilá pripomienka barometer žiadosti (~2 týždne
   bez odpovede), 1 odsek, bez tlaku.
**NIČ SA NEODOSIELA** — drafty schvaľuje a posiela výhradne founder.

---

## ORCHESTRÁTOR — záverečný krok noci

Po dobehnutí všetkých lanes zapíš `docs/reports/2026-08-16-nocna-vlna-report.md`:
tabuľka lane → vetva → PR # → stav (hotové / report / blocked) → čo čaká na
foundera. Zoradené podľa odporúčaného poradia review. Push na vetvu
`docs/nocny-report-2026-08-16`, PR, STOP. Toto je jediný súbor, ktorý
smie vzniknúť mimo tabuliek vyššie.

---

## ✅ PRE-FLIGHT PRE FOUNDERA (2 minúty, PRED spustením)

1. **Odhlás GitHub v Cursorovom embedded browseri.** Agenti nesmú mať cez noc
   merge-schopnú session (nedoriešená záhada merge #416 = presne toto riziko).
2. Skontroluj, že žiadny otvorený PR nemá zapnutý **auto-merge**.
3. Vlož túto notu do repa (`docs/prompts/`) alebo priamo do Cursor chatu
   a odpáľ vlny N1+N2 naraz — sú disjunktné.
4. Spi. Ráno ťa čaká report + rad PR na review.

## 🌅 RANNÝ CHECKLIST PRE FOUNDERA

| # | Krok |
|---|---|
| 1 | Prečítaj nočný report → review PR v poradí: L25 → L22 → L23 → L28 → L29 → L26 → L24 → L27 |
| 2 | L24/L27 migrácie: NEmergovať kód závislý od migrácie, kým ju neaplikuješ cez Dashboard + INSERT do schema_migrations (postup v PR popisoch) |
| 3 | V4-B: podľa runbooku klikni OAuth consent + vlož token do Vercel env (Preview) → deploy → test na vlastnom maili → až potom Smolko |
| 4 | Pošli Smolkovi draft z L29 (po V4-B teste) + RÚ pripomienku |
| 5 | Pozri timeline #416 — auto-merge áno/nie → poviem D-zápis |
| 6 | ÚGKK PDF sken → `docs/legal/` (stále visí) |

## ⏰ Nezabudnuté pripomienky (mimo swarmu)

- **Krajňák 24.8.** — pripomienka nastavená.
- **W1/W3 n8n NEAKTIVOVAŤ** — trvalé, kým nie je doložené komu píšu.
- **Nový webhook kľúč pre Stage 1** vygeneruješ lokálne — smoke-kľúč sa už nepoužije.
- **Vercel Hobby build minúty:** nočné pushe = preview buildy; pri jednom pushi
  na lane to je ~8 buildov, v poriadku. Ak by to niekedy vadilo, vrátime
  inteligentný Ignored Build Step príkaz (len zmeny v apps/crm).
- **Desktop bridge:** po reštarte appky skús ráno „skús bridge".
