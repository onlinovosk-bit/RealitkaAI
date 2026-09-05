# Tri opravy do architektúry a roadmapy Reality Smolko

**Autorita:** founder GO 3. 9. 2026
**Dotknuté dokumenty:**
`docs/architecture/reality-smolko-property-revenue-system-v1.md`
`docs/briefs/reality-smolko-production-roadmap-2026-09-03.md`
**Režim:** vetva + PR + STOP. Docs-only. **Žiadna zmena kódu, žiadna migrácia.**

Zdroj: `C:\Users\aondr\Downloads\task3opravyroadmap.md` (3. 9. 2026).
Claude artifact `https://claude.ai/code/artifact/1080c99d-37d0-4830-901c-df0001576e3e` — fetch 404 (login).

---

## Prečo: obidva dokumenty auditovali KÓD, nie DÁTA

Repo hovorí, že schopnosť existuje. Produkcia hovorí, koľko je v nej riadkov.
Rozišlo sa to na troch miestach. Overené v prod DB `ypgajkhqtbriqqmyawyv` 3. 9. 2026:

```
properties               133   (z toho 132 Reality Smolko)
portal_listings            0
property_price_trail       0
valuation_estimates        5
scheduled_events         tabuľka NEEXISTUJE
```

---

## OPRAVA 1 — Fáza 2 nemá dáta na krivku doby predaja

### Zistenie

`portal_listings` aj `property_price_trail` sú **prázdne**. Engine v
`lib/price-trail/` existuje a funguje, ale nič ho nenaplnilo.

Horšie — analýza Smolkových 132 nehnuteľností ukazuje:

| Zistenie | Číslo | Dôsledok |
|---|---|---|
| `status = 'Aktívna'` | 128 | |
| `status = 'Stiahnutá'` | 4 | |
| **`status = 'Predaná'`** | **0** | **nemáme ani jeden predaj** |
| `type = 'Ostatné'` | **83 (63 %)** | **porovnateľné sa nedajú vybrať** |
| bez ceny | 41 (31 %) | |
| bez výmery | 50 (38 %) | |
| `created_at` rozsah | 25. 5. – 28. 8. 2026 | = dátum synchronizácie, **nie dátum inzerovania** |

### Čo z toho vyplýva

**Krivka „ako dlho sa predáva pri akej cene" sa z našich dát dnes vypočítať
nedá a nebude sa dať mesiace.** Chýbajú predaje aj skutočné dátumy inzerovania.
Netreba to prikrášľovať — treba to napísať.

### Zapracuj do dokumentov

1. Fáza 2 V0 = **výhradne manuálny / licencovaný vstup porovnaní.**
   `PricingEvidenceInput` je správny návrh — doplň dôvod: vlastné dáta nestačia.
2. **Nový podklad, ktorý použiteľný JE:** Smolkových **128 aktívnych ponúk**,
   z ktorých časť je v ponuke od mája. To je legitímny argument pre majiteľa —
   *„toto sú naše vlastné ponuky za takúto cenu, stále nepredané."*
   **Musí byť označené ako „v našej ponuke minimálne X dní"**, lebo `created_at`
   je dátum synchronizácie, nie inzerovania. Nikdy neuvádzaj presný počet dní.
3. **P0 pre akékoľvek porovnateľné: opraviť mapovanie `type`.**
   63 % ponúk má `Ostatné`. Bez kategórie sa porovnateľné vybrať nedajú.
   Zisti, či je chyba v Realvia payloade alebo v našom adaptéri, a napíš to
   do Integration Reportu. **Neopravuj to v tomto PR.**
4. Doplň, že Smolko má v systéme **nula prenájmov** — všetkých 132 je `Predaj`.
   Concierge scope „nájom / kúpa" tým dostáva otvorenú otázku:
   robí prenájmy vôbec, alebo sa len nesynchronizujú?

### Odporúčanie navyše (do roadmapy ako nová položka, nie do V0)

Denný snapshot ceny a stavu každej ponuky do **existujúcej**
`property_price_trail`. Je to lacné, tabuľka aj engine existujú — a je to
**jediný spôsob, ako tú krivku o pol roka mať.** Kto nezačne zbierať dnes,
nebude ju mať nikdy.

---

## OPRAVA 2 — Fáza 5 zapisuje do neexistujúcej tabuľky

`scheduled_events` v produkcii **nie je**. Migrácia
`20260527143000_event_scheduler_phase1.sql` je v repe, ale neaplikovaná —
prod história má 47 záznamov, repo cez 90.

### Zapracuj

- Do Fázy 5 **blokujúci predpoklad**: aplikovať tú migráciu cez Supabase
  Dashboard **pred** začatím prác na bookingu.
- Doplň varovanie: pri ~50 neaplikovaných migráciách sa **nesmie aplikovať
  naslepo**. Najprv prečítať súbor, overiť závislosti na tabuľkách a typoch,
  ktoré v prod existujú, a až potom spustiť. Ak závisí od niečoho
  neaplikovaného, je to samostatné rozhodnutie foundera.
- Rovnaká kontrola platí pre každú ďalšiu tabuľku, ktorú roadmap predpokladá.
  **Do každej fázy doplň riadok „predpokladané tabuľky a ich stav v produkcii".**

---

## OPRAVA 3 — dokument nevie o price-trail engine

Sekcia 6.2 „Čo sa má znovu použiť" neuvádza:

```
apps/crm/src/lib/price-trail/engine.ts
apps/crm/src/lib/price-trail/negotiation-script.ts
apps/crm/src/components/price-trail/PriceChart.tsx
apps/crm/src/components/price-trail/PriceTrailPanel.tsx
apps/crm/src/components/price-trail/MotivationBadge.tsx
tabuľky: portal_listings, property_price_trail
```

### Zapracuj

- Doplň ich do zoznamu na opätovné použitie.
- Napíš, že sú postavené na **inú konverzáciu** — oslovenie motivovaného
  predajcu s dlho visiacim inzerátom, nie stanovenie ceny pri preberaní.
- Napíš explicitne, že **tabuľky sú prázdne**, takže V0 z nich nečerpá.
- Cieľ tejto opravy je jediný: **aby sa to isté nepostavilo tretíkrát.**

---

## Nové pravidlo do `memory/decisions.md`

> **Audit kódu nie je audit dát.** Ku každému tvrdeniu „toto už máme"
> sa dokladá počet riadkov v produkcii, nie existencia súboru.
> Platí pre briefy, roadmapy aj Integration Reporty.

---

## Zakázané v tomto PR

- akákoľvek zmena kódu
- aplikácia migrácie
- oprava mapovania `type`
- zápis do `memory/` mimo toho jedného pravidla vyššie
