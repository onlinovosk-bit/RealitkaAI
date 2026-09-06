# RUFLO SWARM — NOČNÁ VLNA (2. → 3. 9. 2026)

**Režim:** vetva + PR + STOP. **ŽIADNY MERGE · ŽIADNY PUSH DO MAIN ·
ŽIADNE CREDENTIALS · ŽIADNY ZÁSAH DO PROD DB.**
Merge robí výhradne founder ráno. CONSTITUTION: soft 400 / hard 600 riadkov na PR.

**Východiskový stav:** `origin/main` = `bcf7fcb` (#496 — onboarding MVP gate).
P0 s verejnými endpointmi je zavretý. Ráno má founder hovor so zákazníkom
Reality Smolko — **žiadny lane sa nesmie dotknúť ničoho, čo by ten hovor ohrozilo.**

---

## ZÁKON NOCI

1. **Žiadne vymyslené čísla v kóde.** Nikde `?? 124000`. Kde nie sú dáta,
   tam je čestné prázdno. (AP-001 / AP-002.)
2. **Žiadne odosielanie e-mailov.** Ani test, ani upozornenie. Drafty áno, send nikdy.
3. Žiadny zápis do `memory/`. Súhrn noci píše výhradne orchestrátor.
4. **Jeden push na lane**, keď je PR hotový.
5. Žiadny lane nesiaha na súbory iného lane.
6. Konflikt, nejasné zadanie, nenájdený modul → **REPORT, nie improvizácia.**
   Vymyslieť si obsah je horšia chyba než lane nedokončiť.
7. **Pred stavaním čohokoľvek grepni repo, či to už neexistuje.** Trikrát v auguste
   a raz včera sa staval modul, ktorý v repe už bol.

## VSTUPNÁ BRÁNA

```
git fetch origin && git log --oneline origin/main -3
```
Na `origin/main` musí byť `bcf7fcb`. Ak nie → lane sa NESPÚŠŤA, zapíš report.

---

## DÔKAZ NEPREKRYTIA

| Lane | Zapisuje výhradne do | Prod DB |
|---|---|---|
| **L1** verejná registrácia (P0) | `apps/crm/src/app/(public)/register/**` + testy tamtiež | nie |
| **L2** strážca zákazníkov | `apps/crm/src/lib/customer-health/**` (NOVÝ) · `apps/crm/src/app/api/cron/customer-health/**` (NOVÝ) · migračný SÚBOR v `apps/crm/supabase/migrations/` | **nie — len súbor** |
| **L3** audit Architecture Guardian | `docs/reports/2026-09-03-architecture-guardian-audit.md` (NOVÝ) | nie — **read-only** |
| **L4** audit verejných preview stránok | `docs/reports/2026-09-03-public-preview-audit.md` (NOVÝ) | nie — **read-only** |
| **L5** prieskum k modulu Dokumenty | `docs/reports/2026-09-03-dokumenty-prieskum.md` (NOVÝ) | nie — **read-only** |

---

## L1 — verejná registrácia zakladá cudzí tenant (P0)

Vetva `fix/register-creates-own-agency`.

**Nález.** `apps/crm/src/app/(public)/register/actions.ts`:

```ts
const DEFAULT_AGENCY_ID = "11111111-1111-1111-1111-111111111111";
...
await supabase.from("profiles").insert({
  agency_id: DEFAULT_AGENCY_ID,
  team_id: DEFAULT_TEAM_ID,
  ...
```

To UUID **nie je technický kôš.** Je to produkčná agentúra **Reality Smolko s.r.o.**,
jediného platiaceho zákazníka (overené v prod DB 2. 9.). Ktokoľvek sa zaregistruje
cez verejný formulár, pristane v jeho tenante a RLS mu otvorí jeho 448 leadov.

Zatiaľ sa to nestalo — v tej agentúre je 13 profilov, 12 z domény
`realitysmolko.sk` a vlastník. **Žiadna náprava dát teda nie je potrebná**,
len sa musia zavrieť dvere.

**Zadanie.** Registrácia má pre nového používateľa založiť **vlastnú agentúru**
a jeho profil priradiť do nej. `DEFAULT_AGENCY_ID` aj `DEFAULT_TEAM_ID`
zo súboru odstráň.

Pozor na dve veci:

- **RLS.** `createClient()` je user-scoped a INSERT do `agencies` mu politika
  pravdepodobne nedovolí. Zisti, ako sa agentúra zakladá inde v repe, a použi
  ten istý mechanizmus. Ak žiadny neexistuje, **navrhni riešenie v PR popise
  a nestavaj ho** — zakladanie tenantov je bezpečnostná hranica a chce
  founderovo GO.
- **`role`.** Riadok `const role = !count || count === 0 ? "owner" : "agent"`
  počíta profily **globálne**, takže dnes je každý nový používateľ „agent".
  Vo vlastnej agentúre má byť prvý používateľ **owner**. Oprav to spolu s tým.

**Testy:** nový používateľ dostane novú agentúru; jeho `agency_id` sa NIKDY
nerovná `11111111-…`; je `owner` svojej agentúry; dvaja registrujúci skončia
v dvoch rôznych agentúrach.

**Nedotýkaj sa** odosielania welcome e-mailu ani presmerovania na onboarding.

## L2 — strážca zákazníkov

Vetva `feat/customer-health-watchdog`.
**Zadanie je v samostatnom dokumente `task-strazca-zakaznikov.md`** — riaď sa ním
doslova, vrátane kroku 0 (najprv grepni repo) a akceptačného kritéria
(Reality Smolko musí vyjsť ČERVENÁ).

Doplnenie k tomu zadaniu: cesty vyššie v tabuľke sú záväzné. Ak sa počas kroku 0
ukáže, že sa to má radšej pripojiť k existujúcemu `guardian-run`, **nerob to dnes v noci**
— napíš to do PR popisu a nechaj rozhodnutie na foundera. L3 sa Guardiana dotýka
read-only a nechceme kolíziu.

## L3 — audit Architecture Guardian (READ-ONLY)

Vetva `docs/architecture-guardian-audit`. **Nemeň ani jeden riadok kódu.**

Podľa strategického prehľadu má byť Architecture Guardian „z dvoch tretín
postavený — patche 06 a 07, chýba nočný beh nad `main`". **Toto tvrdenie som
nevedel overiť** a nechcem, aby sa podľa neho staval kód.

Zisti a zapíš do reportu:

1. **Existuje Architecture Guardian v repe?** Ak áno, kde presne — súbory, cesty,
   testy. Ak nie, napíš to jednou vetou a lane skonči. **Nič nezakladaj.**
2. Čo z neho reálne beží a čo je iba scaffolding.
3. Čo konkrétne by znamenal „nočný beh nad `main`" — GitHub Action, Vercel cron,
   externý cron? Uveď výhody a nevýhody, nie odporúčanie.
4. Odhad rozsahu v riadkoch a súboroch.

Žiadny návrh typu „prepíšme to". Iba stav, medzera a možnosti.

## L4 — audit verejných preview stránok (READ-ONLY)

Vetva `docs/public-preview-audit`. **Nemaž ani nemeň žiadny súbor.**

V `apps/crm/public/` je jedenásť súborov `preview-*.html`. Sú commitnuté, teda
**verejne dostupné na produkčnej doméne** komukoľvek, kto uhádne URL.

Do reportu zisti pre každý z nich:

- názov, veľkosť, dátum posledného commitu
- čo je jeho obsah jednou vetou
- **či obsahuje tvrdenia o skutočných osobách alebo firmách** — citáty, mená,
  referencie, čísla vydávané za reálne
- odporúčanie: **zmazať / presunúť mimo `public/` / ponechať**, s dôvodom

**Menovite over `preview-demo-page.html`** — obsahuje citát pripísaný osobe
„James Thornton (ex Gong)". Uveď presné znenie a riadok.

Report zoraď podľa rizika, najrizikovejšie hore. **Mazanie vykoná founder
sám po prečítaní.**

## L5 — prieskum k modulu Dokumenty (READ-ONLY)

Vetva `docs/dokumenty-prieskum`. **Nemeň ani jeden riadok kódu. Nič neinštaluj.**

Founder dal GO na nový modul Dokumenty, fáza 1 = **odovzdávací protokol**.
Kontext je v `brief-dokumenty-protokol.md`. V repe **neexistuje nič** —
žiadny storage bucket, žiadna knižnica na `.docx` ani PDF, žiadne nahrávanie
súborov v `apps/crm`. Overené.

Zisti a zapíš do reportu:

1. **Dáta, ktoré vieme predvyplniť.** Prejdi `properties`, `leads`,
   `contacts_dossier`, `lead_property_matches` a vypíš **konkrétne stĺpce**,
   ktoré patria do odovzdávacieho protokolu: adresa, výmera, podlažie, meno,
   telefón, e-mail, dátum. Pri každom uveď tabuľku, stĺpec a typ.
   Zvlášť vypíš **údaje, ktoré v CRM nie sú** a maklér ich bude musieť
   vyplniť ručne (stavy meračov, počet kľúčov, závady).

2. **Ako je riešená tenant izolácia pri súboroch inde v repe**, ak vôbec.
   `apps/realvia-ingestion/src/storage/objectStore.ts` — pozri, čo robí
   a či sa z toho dá čokoľvek prevziať, alebo je to nesúvisiace.

3. **Návrh dvoch migračných súborov** — `document_templates` a `documents` —
   ako **text v reporte**, nie ako súbor v `supabase/migrations/`.
   Composite FK `(agency_id, …)`, RLS `*_tenant` podľa vzoru
   `20260508180000_rls_properties`.

4. **Knižnice.** Čo by bolo treba doinštalovať na generovanie PDF, s veľkosťou
   balíka a licenciou. Uveď 2–3 možnosti a ich nevýhody. **Neinštaluj nič.**

5. **Odhad rozsahu** fázy 1 v súboroch a riadkoch.

Žiadny kód, žiadny `npm install`, žiadna migrácia. Iba report.

---

## ORCHESTRÁTOR — záver noci

Zapíš `docs/reports/2026-09-03-nocna-vlna-report.md`: tabuľka lane → vetva →
PR # → stav → čo čaká na foundera, zoradené podľa poradia review.
Vetva `docs/nocny-report-2026-09-03`, PR, STOP.

**Poradie pri vyčerpaní kvóty (zabíjaj odzadu):** L5 → L4 → L3 → L2 → L1.
**L1 je P0 a musí dobehnúť.**

---

## PRE-FLIGHT PRE FOUNDERA

1. Odhlás GitHub v Cursorovom embedded browseri.
2. Skontroluj, že žiadny otvorený PR nemá auto-merge.
3. Vlož túto notu do Cursor chatu spolu s `task-strazca-zakaznikov.md`.
4. Spi.

## RANNÝ CHECKLIST

| # | Krok |
|---|---|
| 1 | Nočný report → review v poradí: **L1** → L2 → L4 → L3 → L5 |
| 2 | **L1 merguj ako prvé.** Ak lane navrhol riešenie namiesto implementácie, rozhodni a zadaj znova |
| 3 | Pošli Smolkovi runbook s doplneným Client ID (odkaz v kroku 4 bez neho nefunguje) |
| 4 | **Prepni Audience na In production** pred hovorom |
| 5 | **Hovor so Smolkom** — brief `brief-telefonat-smolko.md`. Začni e-mailami, dohodni termín zaškolenia tímu |
| 6 | Po hovore: zápis do `memory/`, termín do kalendára |
| 7 | L4: rozhodni o jedenástich `preview-*.html`, hlavne o tom citáte |
| 8 | **Na hovore sa Smolka spýtaj, ako dnes robí odovzdávací protokol** a čo ho na tom najviac zdržiava — bez toho sa fáza 1 Dokumentov nezadáva |

## PRIPOMIENKY

- Chrome profil „Revolis" výhradne pre `revolis.crm` — dnes ťa zlý účet zabrzdil päťkrát.
- Nevypínať forward na alias 24–48 h po zapnutí pullu.
- W1/W3 n8n NEAKTIVOVAŤ.
- Revízia betu „bundle so slúchadlom" — pripomienka beží.
