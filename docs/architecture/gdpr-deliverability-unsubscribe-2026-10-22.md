---
id: gdpr-deliverability-unsubscribe
title: "Doručiteľnosť a odhlásenie — GDPR posúdenie + Constitution v2 (EMAIL-SUPPRESSION-01)"
type: gdpr-assessment
status: draft-for-founder
created_at: 2026-10-22
confidentiality: internal
depends_on:
  - docs/discovery/2026-10-21/FINDINGS.md   # F-01, F-02
  - docs/architecture/master-data-sourcing-map.md
  - docs/architecture/revolis-constitution-v2.md
---

# Doručiteľnosť a odhlásenie — GDPR posúdenie

**Nie je to právne stanovisko.** Skill `gdpr-advisor` v repe neexistuje, takže smernicu 5 z CLAUDE.md som splnil vlastnou
inžinierskou analýzou (rovnako ako v `inbound-gmail-pull-gdpr.md`). Pred zapnutím u zákazníka ju musí potvrdiť právnik.
Fakty sú z kódu tohto PR; úsudky sú označené „úsudok"; čo neviem, je označené **NEOVERENÉ**.

## 1. Čo sa mení

| | Pred | Po |
|---|---|---|
| Odchádzajúci e-mail (`sendApprovedOutreach`) | bez odhlásenia, bez kontroly potlačenia | pred odoslaním kontrola `email_suppressions` (fail-closed), pätička s podpísaným odkazom, hlavičky `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) |
| Ranný brief | odkaz `?profile=<uuid>` stačil komukoľvek, kto UUID pozná, a GET (aj poštový skener) vypol notifikácie | podpísaný odkaz; GET zobrazí iba potvrdenie, zápis robí POST |
| Resend webhook | proxy ho zahadzovala 401 (F-02), bounce/sťažnosť sa nikde nezapisovali | verejná cesta s overením podpisu; tvrdý bounce / sťažnosť / `suppressed` → globálne potlačenie |
| Ďalší pokus o odoslanie na nedoručiteľnú adresu | opakovaný | zablokovaný |

## 2. Roly a právny základ

Dve rôzne spracúvania, dva rôzne základy (úsudok):

1. **Potlačenie z odhlásenia príjemcu (scope = agentúra).** Prevádzkovateľ je kancelária, Revolis je sprostredkovateľ podľa DPA.
   Zápis vykonáva Revolis na pokyn príjemcu (odkaz) v mene kancelárie. Základ: povinnosť rešpektovať námietku príjemcu
   (čl. 21 ods. 2–3 GDPR — námietka proti priamemu marketingu) a záujem kancelárie nekontaktovať toho, kto odmietol.
2. **Globálne potlačenie z doručiteľnosti (tvrdý bounce, sťažnosť, potlačenie u Resendu; scope = `global`).**
   Tu koná Revolis ako prevádzkovateľ pre vlastný účel: chrániť reputáciu odosielajúcej domény a infraštruktúru, ktorú
   zdieľajú všetci zákazníci. Základ: **6(1)(f) oprávnený záujem**.

### Test vyváženosti pre bod 2 (6(1)(f))

| Krok | Úsudok |
|---|---|
| Účel | Neposielať na adresy, ktoré sú nedoručiteľné alebo sa na ne niekto sťažoval; udržať reputáciu domény a poskytovateľa. |
| Nevyhnutnosť | Bez zoznamu by systém posielal opakovane a poškodil doručiteľnosť všetkých zákazníkov. Miernejší prostriedok (ukladať celú adresu) je horší pre súkromie — preto sa ukladá iba odtlačok. |
| Dopad na dotknutú osobu | Nízky: uloží sa 64-znakový odtlačok, dôvod a čas. Nič iné. Následok je, že ju Revolis **prestane** kontaktovať — v jej prospech. |
| Primerané očakávanie | Osoba, ktorá sa sťažovala alebo jej adresa neexistuje, očakáva, že sa jej to nebude opakovať. |
| Záver | Oprávnený záujem prevažuje. **Podmienka:** záznam slúži iba na potlačenie, nikdy na profilovanie ani marketing. |

## 3. Minimalizácia a ochrana

- Tabuľka `email_suppressions` obsahuje: `email_hash` (SHA-256 normalizovanej adresy), `scope_key`, `reason`, `source`, `created_at`.
  **Žiadna adresa, meno ani obsah správy.**
- **Odtlačok je pseudonymizácia, nie anonymizácia** (úsudok): SHA-256 bez soli sa dá otestovať proti známej adrese (slovníkový
  útok), preto zostáva osobným údajom. Dôvod, prečo nie soľ: kontrola musí fungovať pre ľubovoľnú adresu z viacerých ciest
  (webhook, odkaz, odoslanie) bez zdieľanej per-osoba hodnoty. Ak právnik bude chcieť silnejšiu ochranu, náhrada je HMAC s
  tajomstvom v serveri (zmena iba v `lib/email/suppression.ts` + prehash existujúcich riadkov).
- RLS zapnuté, `anon`/`authenticated` bez prístupu (`revoke all` + explicitná deny-all politika), číta a píše iba service role.
- Podpísaný odkaz: `HMAC-SHA256`, tajomstvo `UNSUBSCRIBE_TOKEN_SECRET` (≥ 32 znakov), bez expirácie (odhlásenie z
  starého e-mailu musí fungovať), bez zápisu na GET, `Cache-Control: no-store`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`.
  Token obsahuje odtlačok adresy, nie adresu.
- Chýbajúce tajomstvo, chýbajúca tabuľka alebo chyba čítania = **odoslanie sa zastaví** (fail-closed). Riziko: nasadenie
  v nesprávnom poradí zablokuje odchádzajúce e-maily (nie stratu údajov) — viď poradie v §6.

## 4. Doba uchovania

Záznam sa **nemaže automaticky**: zmysel potlačenia je trvať. Vymazanie by znamenalo, že adresa sa opäť môže kontaktovať.
Úsudok: uchovanie odtlačku je v súlade s čl. 17 ods. 3 (výnimka pri uplatnení právnych nárokov / plnení povinnosti
rešpektovať námietku) a štandardnou praxou. **NEOVERENÉ:** či právnik chce pevný limit (napr. 5 rokov) a kto spustí výmaz na
žiadosť — dnes je to ručný zásah cez service role.

## 5. Čo toto PR **nerieši** (otvorené, pre právnika)

1. **Právny základ samotného obchodného e-mailu fyzickej osobe** (opt-in vs. výnimka existujúceho zákazníka podľa slovenského zákona
   o elektronických komunikáciách a čl. 13 smernice o súkromí): **NEOVERENÉ**. Odhlásenie je nutná, nie postačujúca podmienka.
   Odosielanie je dnes schvaľované človekom (`/api/outreach/send`), čo riziko znižuje, nie odstraňuje.
2. Odhlásenie z ranného briefu vypína `morning_brief_settings.enabled` — ide o interné notifikácie maklérovi, nie marketing; toto je
   iný režim než bod 1.
3. Staré odkazy v už odoslaných briefoch (`/api/notifications/unsubscribe?profile=`) už nevypínajú nič, iba presmerujú do nastavení.
   Dôvod: ten odkaz mal chybu F-01 (kto pozná UUID, vie vypnúť cudzie notifikácie).
4. Verejné cesty `/api/morning-brief/track/open|click` sú nové bez session; sú gated UUID briefu a zapisujú iba cez RPC
   `record_brief_*`. Zostatkové riziko: kto pozná UUID briefu, môže nafúknuť počítadlo. Dopad: štatistika, nie osobné údaje.

## 6. Zdroje údajov (smernica 4)

`master-data-sourcing-map.md` sa **nemení**: nepribúda nový externý zdroj. Údaje vznikajú z (a) vlastného odoslania cez Resend
(webhook o doručení), (b) kliknutia samotného príjemcu na odkaz. Nič sa nescrapuje, nič z katastra, žiadne údaje z portálov.
Mapa nemá riadok pre „vlastné doručovacie udalosti"; pridávam ho do úvahy pri ďalšej revízii mapy (otvorený bod, nie zmena v tomto PR).

## 7. Poradie nasadenia (nič z toho sa nestalo — každý krok čaká na GO)

1. Migrácia `20261022100000_email_suppressions.sql` do PROD (skill `prod-migration`: preflight → test → zápis → ledger).
2. Nastaviť `UNSUBSCRIBE_TOKEN_SECRET` (≥ 32 znakov) vo Vercel Production. Hodnotu nikto nevidí v chate ani v repe.
3. Nasadiť kód. Až potom `/api/resend-webhook` prestane vracať 401 a odchádzajúca pošta dostane odhlásenie.
4. Overiť: Resend delivery log (Q-01 v `OPEN_QUESTIONS.md`) a jeden testovací bounce na adresu foundera.

Pri inom poradí je zlyhanie **bezpečné** (odoslanie sa zastaví s chybovou hláškou), nie tiché.

## 8. Constitution v2 — 12-otázkový Reality Check

| # | Otázka | Odpoveď (úsudok) |
|---|---|---|
| 1 | Zaplatil by za to dnešný klient? **VETO** | **Nie priamo.** Nikto nekúpi „odhlásenie". Podľa vety VETO by to bolo max VALIDATE. Founder dal výslovné GO na stenu, pretože ide o opravu P1 nálezov (F-01, F-02), nie o predajnú funkciu. Zaznamenané ako **override vetom** — nie je to maskované ako predajný argument. |
| 2 | Zarobí klient viac do 90 dní? | Nepriamo: doručiteľnosť a reputácia domény sú podmienkou, aby outreach vôbec dorazil. Neodmerané. |
| 3 | Skráti cestu lead → provízia? | Nie. |
| 4 | Moat? | Slabo. Je to štandard, nie výhoda. |
| 5 | Flywheel? | Slabo: bounce dáta čistia ďalšie odoslania. |
| 6 | Nové unikátne dáta? | Nie. |
| 7 | ROI vyššie než zvyšok backlogu? | **Nie.** Stripe krok C je priorita #1 a je zablokovaný na founderovi. |
| 8 | Správny čas? **VETO** | Nie „príliš skoro": odosielanie e-mailov už beží a nález F-02 je potvrdený snímkou. |
| 9 | MVP < 2 týždne? | Áno, dodané v jednej stene. |
| 10 | Founder Trap? | Riziko „stavím infraštruktúru namiesto predaja". Mitigácia: stena je uzavretá, bez ďalšieho rozsahu. |
| 11 | Najlepšie využitie času? | Nie — viď 7. Ale blokátor je mimo mojej kontroly (Stripe vstupy). |
| 12 | Jediná vec tohto kvartálu? | Nie. Je to nutná hygiena, nie hlavná stávka. |

**Verdikt: BUILD (override vetom Q1 na výslovné GO foundera; hygiena a P1 oprava, nie predajná funkcia).**
Dôvod zaznamenaný aj v `memory/decisions.md`.
