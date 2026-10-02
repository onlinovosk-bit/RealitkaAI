---
id: inbound-gmail-pull-gdpr
title: "Gmail pull — GDPR posúdenie (CLAUDE.md smernica 5)"
type: gdpr-assessment
status: draft-for-founder
created_at: 2026-10-02
confidentiality: internal
depends_on:
  - docs/architecture/inbound-oauth-pull-design.md
  - docs/runbooks/gmail-pull-setup.md
---

# Gmail pull — GDPR posúdenie

**Nie je to právne stanovisko.** Skill `gdpr-advisor` nebol v tejto session dostupný (zoznam skillov: kontrolor, rau,
strategic-analysis, task-loop), takže smernicu 5 som splnil vlastnou analýzou. Pred zapnutím u zákazníka to musí
potvrdiť founder alebo právnik. Fakty nižšie sú z kódu a z `inbound-oauth-pull-design.md`; úsudky sú označené.

## 1. Čo sa mení oproti dnešku

| | Dnes (auto-forward) | Po pulli |
|---|---|---|
| Čo Revolis dostane | **všetko**, čo Gmail pravidlo preposlalo (2.10. sa ukázalo, že aj nepodstatnú poštu — NDR „552 size exceeded" z 1.10.) | iba správy so štítkom, ktorý si zákazník nastaví filtrom (portály) |
| Kto rozhoduje o rozsahu | Gmail pravidlo, ťažko prehľadné | zákazník filtrom, viditeľne |
| Kanál | e-mail cez cudzie MX (DMARC pasca, limit veľkosti) | Gmail API cez HTTPS |
| Zastavenie | zrušiť pravidlo | odpojiť v Revolise **alebo** odobrať prístup v Google účte |

Úsudok: pull **znižuje** množstvo spracúvaných osobných údajov (minimalizácia, čl. 5(1)(c)). To je hlavný dôvod ho dokončiť.

## 2. Roly a právny základ

- Prevádzkovateľ: kancelária (zákazník). Revolis je sprostredkovateľ podľa DPA (#740). Dopyt je od záujemcu adresovaný kancelárii.
- Základ pre údaje záujemcov: **zákazníkov** (predzmluvné opatrenia 6(1)(b) / oprávnený záujem 6(1)(f) na vybavenie dopytu) —
  Revolis koná na jeho pokyn. Nič nové oproti dnešnému acquire.
- **Oprava návrhu:** `inbound-oauth-pull-design.md` §11 uvádza 6(1)(a) súhlas pri „čítaní schránky". Súhlas majiteľa účtu v Google
  okne je **oprávnenie na prístup**, nie základ na spracovanie údajov tretích osôb (záujemcov). Základom ostáva zákazník ako prevádzkovateľ.
  Súhlas v Google okne treba zaznamenať ako doklad pokynu (kto, kedy), nie ako základ.
- 6(1)(f) vlastný oprávnený záujem Revolisu sa **nepoužíva**.

## 3. Technický limit, ktorý treba povedať otvorene

Google nemá scope „iba tento štítok". `gmail.readonly` technicky dovolí čítať celú schránku. Obmedzenie je **aplikačné**:

1. zoznam sa pýta iba s `labelIds=<štítok>` a oknom `newer_than:Nd` (test + strážca `gmail-pull-boundaries.verification.test.ts`),
2. správa vrátená bez štítka sa zahodí a nikam neposiela (test),
3. telo sa orezáva na 200 000 znakov, prílohy sa nesťahujú,
4. bez pamäte spracovaných ID sa nečíta vôbec (fail-closed).

Zostatkové riziko: Revolis drží token s celoschránkovým čítaním. Mitigácia: súhlasný text to hovorí na rovinu, odvolanie je jedným klikom,
token nie je nikde v gite ani v logoch.

## 4. Čo Revolis ukladá nové

- `agency_gmail_inbound_seen`: iba `agency_id`, `gmail_message_id`, `outcome`, `acquired_at`. **Žiadny obsah ani adresa.** Deny-all pre anon/authenticated (RLS bez politík), service role.
  Retencia 30 dní (maže sám pull). Dôkaz: strážca kontroluje presnú množinu stĺpcov.
- `cron_runs`: počty a kód chyby (napr. `oauth_refresh_failed:invalid_grant`). Žiadny obsah.
- Obsah správy ide ďalej **rovnakou cestou ako dnes** (`/api/acquire/email` → `leads`); retencia leadov sa nemení.

## 5. Pred zapnutím u zákazníka (nesplnené)

- [ ] Dodatok k DPA: nový účel „načítanie označených správ z Gmailu zákazníka" + Google ako zdroj. (Zákazník podpisuje.)
- [ ] Záznam o spracovateľských činnostiach doplniť o tento tok.
- [ ] V zozname subprocesorov chýba Anthropic (triáž tela dopytu) — existujúca medzera z #740, tento tok ju nezväčšuje, ale zvýrazňuje.
- [ ] Zákazník si vytvorí filter sám (alebo s nami na hovore) — **bez filtra pull nič nečíta** (správne správanie).
- [ ] Pilot-limit: token je v premennej prostredia (jeden tenant). Pre viac zákazníkov treba šifrovanú tabuľku z návrhu §8.

## 6. Google režim aplikácie (neoverené — skontrolovať v Cloud Console)

Podľa dokumentácie Google má externá aplikácia v stave *Testing* refresh token s platnosťou 7 dní; v *In production* bez verifikácie
nevyprší, ale zobrazí sa varovanie „nepotvrdená aplikácia" a platí limit 100 používateľov. Pre pilot jedného zákazníka je prakticky
jediná cesta *In production (unverified)*; široký rollout čaká na verifikáciu restricted scope (fáza F návrhu). Toto som **nemeral**,
je to z dokumentácie.
