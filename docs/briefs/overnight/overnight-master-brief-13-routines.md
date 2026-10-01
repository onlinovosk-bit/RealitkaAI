---
title: "Overnight Master Brief 13 — Routine Engine (own-data routines)"
project: Revolis.AI
type: overnight-master-brief
brief_number: 13
status: ready
created: 2026-06-16
tags: [revolis, routines, seller-rescue, ceo-command, own-data, no-fake-data]
related:
  - "[[master-data-sourcing-map]]"
  - "[[overnight-master-brief-9-v2]]"
  - "[[signal-layer-brief]]"
  - "[[clay-positioning-reframe]]"
---

# OVERNIGHT MASTER BRIEF 13 — Routine Engine

> Z 5 navrhnutých rutín staviame LEN tie, čo bežia na vlastných dátach a
> rozširujú Action Queue (#202): Seller Rescue + CEO Command. Listing Dominator
> len self-analýza. Deal Risk len skeleton (žiadne fake predikcie). Market
> Intelligence NESTAVIAME (= signal-layer-brief, data-blocked na portáloch).
> Princíp: rutina ukazuje reálne dáta, alebo čestne mlčí. Nikdy fikciu.

## ŽELEZNÉ PRAVIDLO (merge gate, GUARD)
- Rutina zobrazí výstup LEN z reálnych dát. Kde dáta nie sú → čestný prázdny
  stav ("zatiaľ žiadne ohrozené leady" / "doplní sa po používaní"), NIE
  vymyslené čísla, mená, ani percentá pravdepodobnosti.
- ZAKÁZANÉ: fake "pravdepodobnosť uzavretia 73%", vymyslené TOP klienti,
  hardcoded mená (Kováč/Poláková/...).
- GUARD test na každú rutinu: render neobsahuje fake metriky/mená.
- Copy v duchu clay-positioning-reframe: výsledok, nie technológia.

## WAVE A — Seller Rescue Routine (vlastné dáta, rozšírenie #202)
Trigger: denný job (napr. cron 06:00) + on-demand v UI.
Logika:
1. Nájdi leady bez kontaktu > N dní (N konfigurovateľné, default 7).
   - Zdroj: `last_contact` (POZOR: teraz text, viď Brief 12 E.1 → timestamptz).
   - Ak `last_contact` prázdne → použiť `created_at` ako fallback.
2. Risk skóre LEN z dostupných signálov (dni bez kontaktu, status, počet
   aktivít). NEVYMÝŠŠAJ "behaviorálne" skóre, na ktoré nemáš dáta.
3. "Predávajúci" filter: ak intent/property_type chýba (teraz prázdne),
   v1 pracuje so VŠETKÝMI leadmi bez kontaktu, NIE len predávajúcimi
   (seller-only = pending, kým nie je intent field). Toto čestne uveď v UI.
4. Priprav follow-up draft (email/SMS) cez existujúci AI — personalizovaný
   z reálnych polí leadu, žiadne vymyslené detaily.
5. Vytvor úlohu maklérovi (existujúci task/activity mechanizmus, lead_id povinné).
Výstup: zoznam ohrozených leadov + dôvod (dni bez kontaktu) + akcia + draft.
Prázdny stav: "Žiadne leady bez kontaktu nad N dní — dobrá práca."

## WAVE B — CEO Command Center (agregát vlastných dát)
Trigger: denný job (07:00) + on-demand.
Sekcie — KAŽDÁ označená live/pending podľa dát:
- LIVE teraz: nové leady (count za obdobie), leady podľa zdroja, počet
  nekontaktovaných, počet v "Teplý"/pipeline (z #202 dát).
- PENDING (čestne označené, žiadna fikcia):
  - "najvýkonnejší makléri" → potrebuje multi-maklér usage (pending).
  - "predikcia obratu/provízií" → potrebuje budget + uzavreté obchody
    (budget prázdny, žiadne closed deals → pending, NIE fake číslo).
  - "ohrozené zákazky" → ťahá z Deal Risk skeletonu (pending).
- "Čo by som dnes riešil" → generuj LEN z reálnych live sekcií (napr.
  "X nekontaktovaných leadov nad 7 dní"). Žiadne vymyslené odporúčania.

## WAVE C — Listing Dominator (LEN self-analýza)
- Self-analýza vlastného inzerátu cez AI: kvalita textu, úplnosť polí, SEO
  hygiena, kvalita/počet fotiek. Žiadne externé dáta netreba → buildable.
- "Porovnanie s konkurenciou" → PENDING (Zhluk 5, portály, data-blocked na
  Nehnuteľnosti Admin). NEROB fake "lepší/horší než konkurencia".
- Skóre LEN za to, čo vieš reálne vyhodnotiť z vlastného inzerátu.

## ČO TENTO BRIEF NESTAVIA (vedome)
- **Deal Risk Radar predikcie** — len skeleton/placeholder (pending), ŽIADNE
  pravdepodobnosti uzavretia/zlyhania (nemáš dáta → bola by to fikcia).
- **Market Intelligence Machine** — NESTAVIAME, je to signal-layer-brief,
  data-blocked na portáloch. Neduplikovať.
- Nič, čo potrebuje portálové dáta, dáta vlastníkov, alebo deal históriu.

## TESTOVANIE (POVINNÉ)
- Unit: Seller Rescue výber (dni bez kontaktu, fallback na created_at),
  risk skóre len z dostupných polí; CEO Command agregácie (count správne).
- GUARD: každá rutina — render bez fake metrík/mien/percent.
- Prázdne stavy: pri prázdnych/chudobných dátach rutina zobrazí čestný empty
  state, nie vymyslený obsah (explicitný test).
- Integračné (ephemeral CI): RLS scoping na všetky čítané tabuľky (agency_id).
- `npm run build` zelené, CI (ephemeral) zelená.

## DELIVERABLES
- PR per wave (seller-rescue, ceo-command, listing-dominator-self),
  bez miešania.
- `docs/briefs/overnight/overnight-master-brief-13.md` + status.
- Aktualizovaný module registry (live/pending stavy per rutina/sekcia).
- DENYLIST: routine/agent cesty (manuálny review).
- NIČ do main bez green CI + GUARD.

## PREČO TIETO DVE SÚ TVOJ WOW (a prečo nie Deal Risk teraz)
Seller Rescue a CEO Command bežia na dátach, ktoré GENERUJEŠ používaním
(Action Queue). Čím viac sa CRM používa, tým bohatší ich výstup — sám sa
oživuje. Deal Risk a Market Intelligence potrebujú dáta, ktoré ešte nemáš
(deal história, portály). Wow efekt pre majiteľa RK je REÁLNY — ale príde z
rutiny, ktorá ukáže PRAVDIVÝCH 10 ohrozených klientov, nie z peknej obrazovky
s vymyslenými percentami. Pravda škáluje, fikcia sa zrúti pri prvom kliknutí.
