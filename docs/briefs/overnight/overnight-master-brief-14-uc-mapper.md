---
title: "Overnight Master Brief 14 — Nehnuteľnosti/UC Export API Mapper"
project: Revolis.AI
type: overnight-master-brief
brief_number: 14
status: implemented
created: 2026-06-17
tags: [revolis, nehnutelnosti, united-classifieds, mapper, import, real-schema]
related:
  - "[[overnight-master-brief-10-realsoft]]"
  - "[[master-data-sourcing-map]]"
  - "[[revolis-constitution-v2]]"
---

# OVERNIGHT MASTER BRIEF 14 — Nehnuteľnosti/UC Export API Mapper

> Postavené z REÁLNEJ dokumentácie (United Classifieds export API v1,
> plt.unitedclassifieds.sk/import/docs/v1/realsoft/docs/export/intro).
> NIE z hádania (AP-003 dodržaný). Protokol je IDENTICKÝ s #203 receiverom
> — to isté UC API ako RealSoft. Receiver stojí; toto je hlavne MAPPER.

## ČESTNÝ ROZSAH (čítaj pred stavaním)
Toto API dáva LEN: **zákazky (nehnuteľnosti)** + **maklérov**.
NEDÁVA: klientov, kupujúcich, dopyty/záujemcov.
→ Napĺňa INVENTÁR + agentov, NIE lead/klient stranu. Klientske dáta naďalej
treba zo Seligovho exportu (jednorazový) — toto ho nenahrádza.
→ Mapper píše do `properties` (zákazky) a profilov/agentov (makléri),
NIE do `leads` ako kupujúci/predávajúci.

## PROTOKOL (z dokumentácie — zhodný s #203)
- POST na našu URL. Parametre: `user`, `pass`, `action` (1=zákazka, 2=maklér),
  `data` (JSON). Odpoveď JSON: `code`, `importId`, `message`, `url`.
- Návratové kódy: 1=added, 2=edited, 3=deleted, 4=not found, 10=wrong login,
  11=missing data, 12=wrong data (JSON parse fail), 13=custom.
- **Auth:** my definujeme `user`/`pass`, zadáme ich v ich export nastaveniach
  (polia "API endpoint" = naša URL, "API kľúč"/prihlásenie). Receiver overuje
  hashom (reuse #203 `resolve_agency_id_for_realsoft_credentials`).

## ÚLOHA 1 — Receiver kompatibilita (over, neprerábaj zbytočne)
- #203 `/api/realsoft/import` je tá istá UC schéma. Over, či ho vieš reuse-núť
  priamo, alebo pridať `/api/uc/import` (alias). Návratové kódy 1–13 už #203 rieši.
- Spracuj `action` add/edit/delete: kód 1/2 = upsert, kód 3 = soft-delete.
- Dedupe/idempotencia: zákazka podľa `object_id` (stabilné, nikdy sa nemení),
  maklér podľa `user_id` (stabilné). Edit = update existujúceho, nie duplikát.

## ÚLOHA 2 — Maklér mapper (action=2) — z reálnych polí
`apps/crm/src/lib/uc/mapper-agent.ts`:
- `user_id`→externý id agenta, `full_name`, `phone_work` (reuse phone-normalizáciu!),
  `email_work`, `sora` (bool), `nark` (bool), `deleted` (bool→soft-delete),
  `image.url` (+ `image.changed` pre re-fetch logiku).
- Mapuj na profil/agenta agentúry, scoped na agency_id.

## ÚLOHA 3 — Zákazka mapper (action=1) — z reálnych polí
`apps/crm/src/lib/uc/mapper-listing.ts` → `properties` tabuľka:
- **Identita:** `object_id` (unikát), `extern_id`, `id`, `agent_id` (väzba na makléra).
- **Lokalita:** `state_id`, `county_id`, `district_id`, `region_id`, `citypart_id/_string`,
  `street_id`, `street`, `street_number`, `street_show` (bool), `gps_x`, `gps_y`.
- **Klasifikácia:** `category`, `subcategory`, `action` (predaj/prenájom), `ownership`,
  `house_type`, `status`, `energy_cert`, `energy_rating`, `orientation`.
- **Ceny:** `price`, `price_currency` (povinné), `price_unit`, `price_by_agreement` (bool),
  `price_energy`, `price_down`, `unit_price`, `price_commission_in_price` (bool),
  `price_note_public`, `price_realized`.
- **Plochy:** `usable_area`, `plot_area`, `building_area`, `office_area`, `total_area`,
  `store_area`, `front_garden_area` (+ `_to` varianty = rozsahy).
- **Dispozícia:** `rooms_count`, `bathrooms_count`, `floor`, `floors`, `floors_under`.
- **Príznaky (bool):** kúrenie (`heating_*`), podlahy (`floor_*`), okná (`window_*`),
  bezpečnosť (`security_*`), kuchyňa (`kitchen_*`), kúpeľňa (`bath_*`), prístup
  (`access_*`), výhody (`adv_*`), dostupnosť (`availability_*`). Ulož ako jsonb
  alebo zmapuj podmnožinu, čo reálne zobrazíš — zvyšok do `raw` jsonb.
- **Jazyky:** `langData{lang:{title,description}}` — ulož titulok/popis per jazyk.
- **Obrázky:** `images[{url,changed}]` — `changed=false` → nesťahuj znova.
- **Médiá:** `medias{youtube|matterport|vimeo|...:[urls]}` — ulož platformu+url.
- **Číselníky (state_id, category, status…):** v1 ulož RAW id + popis kde je;
  plné mapovanie číselníkov = fáza 2 (dokumentácia ich má, sú rozsiahle).
- GUARDRAIL: žiadne vymyslené pole. Čo nie je v schéme, nemapuj. Neznáme pole
  → `raw` jsonb + log, NIE ticho zahodiť.

## ÚLOHA 4 — Logging + audit
- Reuse `realsoft_import_logs` (alebo `uc_import_logs`): agency_id, action,
  object_id/user_id, raw_payload jsonb, received_at, výsledný code.
- RLS scoped na agency_id (cudzia agentúra nevidí cudzie importy).

## TESTOVANIE (POVINNÉ)
- Unit: mapper na REÁLNYCH ukážkach z dokumentácie (maklér príklad + zákazka
  príklad sú v docs — použi ich ako fixtures). Phone normalizácia. Dedupe na
  object_id/user_id. Delete (action=3) → soft-delete.
- Integračné (ephemeral CI): auth (správny user/pass → agency; zlý → code 10),
  RLS na import logs, upsert vs duplikát.
- Wrong/missing data → code 11/12 ako dokumentácia očakáva.
- `npm run build` + CI (ephemeral) zelené.

## DELIVERABLES
- PR `uc-export-mapper` (mapper-agent + mapper-listing + receiver alias).
- Migrácia pre `properties` polia, čo chýbajú (z reálnej schémy).
- `docs/briefs/overnight/overnight-master-brief-14.md` + status.
- DENYLIST: `uc/`, `realsoft/` cesty (data ingestion = manuálny review).
- NIČ do main bez green CI + Kontrolór prejazd.

## ČO TENTO BRIEF NEROBÍ
- Nenapĺňa leady/klientov/dopyty (toto API ich nedáva — Seliga export áno).
- Nemapuje plné číselníky (fáza 2).
- Nehádá polia — mapuje len z dokumentovanej schémy, zvyšok do `raw` jsonb.
