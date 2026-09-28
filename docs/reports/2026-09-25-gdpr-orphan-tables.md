# GDPR posúdenie: 5 osirelých tabuliek s osobnými údajmi

**Dátum:** 2026-09-25 · **Projekt:** `ypgajkhqtbriqqmyawyv` · **Brána:** founder GO
**Nadväzuje na:** časť C v `docs/reports/2026-09-25-schema-drift-inventory.md` (AP-023)

## Najprv chýbajúci nástroj

`CLAUDE.md` Direktíva 5 hovorí: *„run the `gdpr-advisor` skill against the chosen
source from the data-sourcing map before implementation."*

**Ten skill neexistuje.** `.claude/skills/` obsahuje `kontrolor`,
`strategic-analysis` a `task-loop`. Nič s názvom `gdpr-advisor` v repozitári nie je:

```
$ ls .claude/skills/
kontrolor  strategic-analysis  task-loop
```

Povinná brána teda nie je len nepoužitá — **nedá sa použiť.** Toto posúdenie je
robené ručne proti `docs/architecture/master-data-sourcing-map.md`. Je to
náhrada, nie splnenie Direktívy 5, a hovorím to skôr než čokoľvek iné, aby sa to
nečítalo ako „GDPR brána prebehla".

## Čo som čítal a čo NIE

| čítal som | nečítal som |
|---|---|
| `information_schema.columns` (názvy a typy stĺpcov) | **obsah čo i len jedného riadku** |
| `count(*)` | hodnoty stĺpcov |
| `pg_policies` (RLS stav) | `raw_data`, `profil`, `behavioral_notes` |

Obsah riadkov som neotvoril zámerne. Pri údajoch s neustáleným pôvodom je
prvý krok zistiť, čo to je a odkiaľ, nie pozerať sa na ne.

## Predmet

| tabuľka | riadkov | osobné údaje v schéme | RLS | policies |
|---|---|---|---|---|
| `revolis_zaujemcovia` | **6** | `full_name`, `behavioral_notes`, `preferred_location`, `profil`, `raw_data` | ✅ | **0** |
| `revolis_leads` | **1** | `email`, `data` (jsonb) | ✅ | **0** |
| `AI AGENT AUTOMAT ONBOARDING no.2.01` | **6** | `phone`, `website_url`, `region`, `notes` | ✅ | **0** |
| `AI AGENT AUTOMAT ONBOARDING` | **17** | neurčiteľné — jediný stĺpec sa volá `<img src="https://r2cdn.perplexity.ai/...` | ✅ | **0** |
| `gpmmfashion@gmail.com tabulka` | 0 | žiadne (`id`, `created_at`) | ✅ | **0** |

Spoločné pre všetkých päť: **nezakladá ich žiadna migrácia, nečíta ich žiadny
aplikačný kód, nemajú vlastníka ani retenčnú lehotu.**

RLS je zapnutá a policies sú nula, takže cez PostgREST ich `anon` ani
`authenticated` neprečíta. **To je jediná dobrá správa a je náhodná** — vznikla
tým, že tabuľky nikto nedokončil, nie tým, že ich niekto zabezpečil. Service role
RLS obchádza, takže prístup cez service key zostáva.

## Posúdenie proti data-sourcing map

`master-data-sourcing-map.md`, sekcia PRÁVNE ZÁKLADY, je v tomto jednoznačná:

> **Fakty vs osobné údaje:** cena/plocha/lokalita inzerátu = fakt (obhájiteľné).
> Meno/telefón/e-mail predajcu = osobný údaj (GDPR, default **NEUKLADAŤ**).

a ZHLUK 5 (realitné portály):

> Fakty z inzerátu (cena, plocha, lokalita, dátum) = obhájiteľné.
> **Osobné údaje predajcu = GDPR NIE.** ToS + právo na databázu = riziko.

### `revolis_zaujemcovia` — najzávažnejší prípad

Schéma je tvarovaná presne ako to, čo mapa zakazuje:

- `full_name` — meno fyzickej osoby
- `source_portal` — stĺpec, ktorý existuje preto, aby držal **názov portálu**
- `external_id` — identifikátor záznamu **na tom portáli**
- `behavioral_notes`, `readiness_score` — profilovanie správania osoby
- `raw_data` (jsonb) — nespracovaná odpoveď zdroja

Kombinácia `source_portal` + `external_id` + `raw_data` je podpis dát prebraných
z externého portálu, nie dát získaných od dotknutej osoby.

**Čo tvrdím a čo netvrdím.** Netvrdím, že tie riadky pochádzajú z portálu —
hodnotu `source_portal` som nečítal. Tvrdím, že **schéma je navrhnutá na ukladanie
presne toho, čo mapa označuje ako „GDPR NIE"**, a že to stačí na to, aby sa pôvod
overil, nie odhadol.

Ak riadky pochádzajú z portálu:
- **Čl. 14** (údaje nezískané od dotknutej osoby) → informačná povinnosť do 1
  mesiaca. Nesplnená, 6 osôb.
- **Čl. 6(1)(f)** → legitímny záujem vyžaduje zdokumentovaný balancing test.
  Neexistuje.
- **Čl. 5(1)(e)** → obmedzenie uchovávania. Žiadna retencia nie je nastavená.
- **ToS portálu + sui generis právo na databázu** → riziko nezávislé od GDPR.
- `behavioral_notes` + `readiness_score` = **profilovanie** (Čl. 22 recitál 71),
  čo zvyšuje nároky na transparentnosť.

### `revolis_leads`

1 riadok, `email` + `data` jsonb, `bri_index` je generated stĺpec čítajúci
`data->'ai_metrics'->>'buyer_readiness_index'`. Teda tam bol scoring pipeline.
Jeden e-mail bez známeho pôvodu a bez retencie. Menší rozsah, tá istá otázka.

### `AI AGENT AUTOMAT ONBOARDING no.2.01`

`website_url`, `phone`, `region`, `agent_count`, `source`, `last_contacted_at`,
`demo_clicked_at`, `lead_score`, `notes` — to je **outreach zoznam realitných
kancelárií**, teda B2B. Podľa ZHLUK 4 je firemný kontakt obhájiteľnejší než údaj
fyzickej osoby, ale `phone` môže byť mobil konkrétneho makléra. 6 riadkov.

Prvé tri stĺpce sa volajú `Názov stĺpca`, `Typ dát`, `Constraints` — to je hlavička
markdown tabuľky vložená do Supabase Dashboardu ako definícia schémy. Tabuľka
nevznikla návrhom, vznikla copy-paste.

### `AI AGENT AUTOMAT ONBOARDING`

17 riadkov v tabuľke, ktorej **jediný stĺpec sa volá**
`<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-da`. To je kus HTML
z výstupu Perplexity vložený do poľa pre názov stĺpca. Čo je v tých 17 riadkoch,
sa zo schémy určiť nedá.

## Čo z toho vyplýva

1. **Rozsah je malý, princíp nie.** 30 riadkov nie je incident hlásiteľný úradu.
   Ale je to dôkaz, že cesta „AI nástroj → copy-paste do Supabase Dashboardu"
   obchádza celú governance vrstvu: migrácie, code review, RLS model aj
   Direktívu 4. Ďalší raz to nemusí byť 30 riadkov.
2. **Direktíva 5 je nevykonateľná.** Brána, ktorú ústava vyžaduje, neexistuje.
3. **Nulové policies nie sú bezpečnosť.** Je to nedokončenosť, ktorá zhodou
   okolností vyzerá ako zámok.

## Odporúčanie — v tomto poradí

1. **Zistiť pôvod `revolis_zaujemcovia`** (founder, minúty): odkiaľ tých 6
   riadkov je? Ak z portálu, platí všetko vyššie. Ak z vlastného formulára so
   súhlasom, je to ZHLUK 1 a problém je len chýbajúca retencia.
2. **Podľa odpovede:** doplniť záznam o spracovateľskej činnosti + balancing test
   + Čl. 14 oznámenie, **alebo** údaje zmazať. Oboje je legitímny výsledok;
   nelegitímne je nechať to tak.
3. **Zmazať `gpmmfashion@gmail.com tabulka`** — 0 riadkov, žiadna otázka.
4. **Postaviť `gdpr-advisor` skill**, aby Direktíva 5 prestala byť mŕtvy odkaz.
5. **Zvážiť zablokovanie tvorby tabuliek cez Dashboard** (len service role /
   migrácie), aby sa cesta, ktorou toto vzniklo, zavrela.

## Čo tento dokument NEROBÍ

**Nič nemaže a nič nemení.** Zmazanie údajov, ktorých pôvod a právny základ nie
sú ustálené, je nesprávny prvý krok — zničí aj dôkaz o tom, odkiaľ pochádzajú,
ktorý môže byť potrebný. Baseline migrácia v tom istom PR tieto tabuľky
**zaznamenáva tak, ako sú**, čo nie je ich schválenie; je to podmienka toho, aby
čistá databáza zodpovedala produkcii.
