# RUFLO SWARM — plán na ~2 hodiny bez foundera (10.8.2026)

**Cieľová cesta:** `docs/prompts/ruflo-swarm-plan-2026-08-10.md`
**Režim:** founder offline. Agenti pripravujú VETVY a REPORTY.
**ŽIADNY MERGE, ŽIADNY PUSH DO MAIN, ŽIADNY DEPLOY, ŽIADNE ODOSLANIE ČOHOKOĽVEK.**
Merge robí výhradne founder po návrate.

---

## Dôkaz neprekrytia (podmienka paralelnosti podľa Ústavy)

| Lane | Zapisuje do | Migrácia | Závislosť na inej lane |
|---|---|---|---|
| L1 atribúcia | `apps/crm/src/app/(marketing)/odhad/**` · `apps/crm/src/app/api/valuation/estimate/route.ts` · `data/regional-prices.json` (len meta) | žiadna | žiadna |
| L2 ŠÚ SR ingescia | `data/susr-sp3801qr.json` (NOVÝ) · `scripts/fetch-susr.ts` (NOVÝ) | žiadna | žiadna |
| L3 Stage 0 ZISTI | `docs/architecture/acquisition-os-stage0-zisti-report.md` (NOVÝ) | žiadna — READ-ONLY prieskum | žiadna |
| L4 genome audit | `docs/architecture/genome-layer2-audit.md` (NOVÝ) | žiadna — READ-ONLY | žiadna |

Žiadne dva lane sa nedotýkajú toho istého súboru, žiadna zdieľaná migrácia,
žiadna dátová závislosť. L1 mení `meta` v regional-prices.json, L2 vytvára
NOVÝ dátový súbor — zámerne oddelené, aby konflikt nevznikol ani v `data/`.

---

## LANE 1 — Atribúcia NBS vo widgete (kódové PR, vetva `feat/nbs-atribucia`)

Vykonaj KOMPLETNE zadanie `docs/prompts/pr-nbs-atribucia.md`.
Zhrnutie: atribučný riadok pod pásmo odhadu (znenie v
`docs/legal/nbs-povolenie-2026-08-10.md`), `attribution` do meta
regional-prices.json, aditívne pole `sources` v API odpovedi.
NEMEŇ výpočet, band_rules ani číselné hodnoty. 3 testy podľa zadania.
Výstup: pushnutá vetva + otvorený PR s description. NEMERGUJ.

## LANE 2 — ŠÚ SR sp3801qr ingescia (kódové PR, vetva `feat/susr-sp3801qr`)

Vykonaj mini-zadanie z `docs/legal/susr-povolenie-2026-08-10.md`:
1. Cez API zisti dimenzie kocky sp3801qr (kódy krajov, typy nehnuteľností,
   bázu indexu) — zapíš ich do PR description.
2. Skript `scripts/fetch-susr.ts` (bez novej npm závislosti — fetch stačí),
   stiahni Prešovský + Košický kraj, ulož `data/susr-sp3801qr.json` s meta
   (source, table, fetched, licencia → docs/legal/susr-povolenie-2026-08-10.md).
3. NIČ nezapájaj do výpočtu. Ak API vráti neočakávanú štruktúru, ulož report
   o štruktúre namiesto dát a napíš to do PR — neuhýbaj vymýšľaním.
Výstup: pushnutá vetva + PR. NEMERGUJ.

## LANE 3 — Acquisition OS Stage 0: NAJPRV ZISTI report (read-only)

Z `docs/prompts/acquisition-os-stage0-execution.md`, ČASŤ 2, vykonaj IBA blok
NAJPRV ZISTI (body 1–6). ŽIADEN kód, žiadna migrácia, žiadna zmena súborov —
jediný výstup je `docs/architecture/acquisition-os-stage0-zisti-report.md`:
1. Presné PK/FK schémy agencies, leads, activities, teams, profiles;
   má leads UNIQUE(agency_id, id)?
2. Presný tvar RLS politiky leads + signatúra profile_agencies_for_auth()
3. Kde žijú naplánované joby (Vercel cron? n8n? iné?) — s cestami k súborom
4. Ako repo skladuje secrets — s konkrétnymi príkladmi z kódu
5. Service account pre Google Ads API: over požiadavku domain-wide delegation
   a posúď realizovateľnosť s naším setupom; ak nerealizovateľné, napíš
   odporúčanie OAuth fallback (je v blueprinte locked)
6. Existuje čokoľvek s prefixom acquisition_? 
Každé tvrdenie s cestou k súboru a riadkom. Vetva `docs/stage0-zisti`, PR. NEMERGUJ.

## LANE 4 — Audit záhadnej migrácie (read-only)

`apps/crm/supabase/migrations/2026_genome_layer2.sql` má rozbitý názov
(chýba timestamp). Zisti a zapíš do `docs/architecture/genome-layer2-audit.md`:
kto/čo ju vytvorilo (git log), čo obsahuje, či bola aplikovaná na prod DB
(NEPRIPÁJAJ sa na prod — odvoď z obsahu a z toho, či ju referencuje kód),
či kolíduje s poradím migrácií, a NÁVRH riešenia (premenovať / zmazať /
ponechať) — ale NIČ NEVYKONAJ. Vetva `docs/genome-audit`, PR. NEMERGUJ.

---

## Spoločné pravidlá pre všetky lane (neprerokovateľné)

1. Merge = NIKDY. Push len vlastnej feature vetvy.
2. Žiadna zmena existujúcich migrácií, žiadna nová migrácia.
3. Žiadne credentials do kódu, logov ani promptov.
4. Konflikt s existujúcim kódom → STOP, zapíš do PR description, čakaj.
5. Ak lane nemôže splniť zadanie, výstupom je REPORT prečo — nie improvizácia.

## Checklist pre foundera po návrate (v tomto poradí)

1. Prečítaj L3 ZISTI report → rozhodni service account vs OAuth (jedna veta)
2. Prečítaj L4 genome audit → rozhodni o migrácii
3. Review + merge L1 (atribúcia — právna povinnosť, má prednosť)
4. Review + merge L2 (dáta)
5. Až potom: Day 1–2 klikačky pre Stage 0 (Test MCC, service account JSON)
