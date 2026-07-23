# PREMORTEM šablóna — Revolis (v1.0)

**Cieľová cesta:** `docs/templates/premortem.md`
**Použitie:** povinné pre Strategic Bet a Core Platform iniciatívy; voliteľné
pre veľké obchodné kroky (kampaň, kľúčový deal, onboarding zákazníka).
**Timebox:** 20 min solo / 45 min s ďalšími ľuďmi. Prekročenie = STOP,
zapíš čo máš. **Výstup:** vyplnená kópia tohto súboru →
`docs/premortems/YYYY-MM-DD-<nazov>.md` + top riziká do brain/registry.

---

## KROK 1 — Podklad (bez neho premortem nezačína)
Odkáž na brief/plán obsahujúci: cieľ · metriku úspechu · stakeholderov ·
scope+rozpočet · míľniky · časovú os · komunikačný plán. Chýba niektorá
časť? Najprv doplň plán — premortem nad hmlou generuje hmlisté riziká.
- [ ] Plán: `<link/cesta>` · všetkých 7 častí prítomných

## KROK 2 — Perspektívy (kompenzácia solo kontextu)
Povinne vyplň VŠETKY štyri hlasy — každý hlas píše riziká SAMOSTATNE,
až potom sa zlúčia (ochrana pred kotvením na prvý nápad):
1. **Founder (ty):** riziká z pohľadu biznisu a kapacity.
2. **Adversariálny inžinier (Claude/Cursor v role):** technické zlyhania,
   presne v štýle incidentu 22.07 (kód pred migráciou).
3. **Zákazník (reálny hlas!):** čo by povedal Smolko/Vitko? Ak môžeš,
   POŠLI im 1 otázku ("čo by vás na X najviac nahnevalo?") — reálna
   odpoveď > tvoja simulácia. Inak použi ich minulé citáty/námietky.
4. **Externý realizátor (Novák/partner, ak relevantný):** async, 1 otázka
   mailom stačí.
- [ ] Min. 1 hlas je od reálnej druhej osoby (async postačuje). Ak to
  nebolo možné, zapíš prečo — a ber výsledok ako slabší.

## KROK 3 — Imaginácia zlyhania (jadro metódy)
Napíš v MINULOM ČASE, dátum = koniec iniciatívy + 30 dní:
> „Je <dátum>. <Iniciatíva> zlyhala. Stalo sa toto: ..."
Min. 8 konkrétnych príčin naprieč kategóriami (min. 1 z každej):
TECH · BIZNIS/PENIAZE · PRÁVO/GDPR · PREVÁDZKA/ĽUDIA · TRH/ZÁKAZNÍK.
Pravidlo konkrétnosti: „nevyšlo to" je zakázané; „Smolko dostal 40 leadov
z Ads, ale nikto ich do 24 h nezavolal a minuli sme 300 € na kontakty,
ktoré vychladli" je správne.

## KROK 4 — Zdieľanie a zápis
Zlúč hlasy do JEDNEJ tabuľky, každé riziko raz (duplicitu zlúč, neopakuj):
| # | Riziko (konkrétne, minulý čas) | Hlas | Kategória |
|---|---|---|---|

## KROK 5 — Prioritizácia (matica P×Z)
Oskóruj: Pravdepodobnosť 1–3 × Závažnosť 1–3 = skóre 1–9.
| # | Riziko | P | Z | Skóre | Pásmo |
|---|---|---|---|---|---|
Pásma: **6–9 = MUSÍ mať mitigáciu v pláne pred štartom** · 3–4 = zapísať
+ vlastník sleduje · 1–2 = len evidované. Cieľ ~10 rizík; ak máš 25,
zlučuj; ak 3, vráť sa ku Kroku 3 — nebol si dosť konkrétny.

## KROK 6 — Revízia plánu a slučka späť
Pre každé riziko so skóre ≥6:
| Riziko | Mitigácia (zmena PLÁNU, nie sľub pozornosti) | Vlastník | Kill/stop signál | Check-in |
|---|---|---|---|---|
- **Kill signál** = merateľná podmienka, pri ktorej sa zastavuje/mení kurz
  (Revolis nadštandard — píše sa PRED štartom, nie pri probléme).
- **Check-in kadencia:** pri každom míľniku plánu + zápis do brain/
  (decision s outcome review dátumom) — premortem, na ktorý sa nikto
  nepozrie, je divadlo.
- [ ] Plán/brief bol reálne ZMENENÝ podľa mitigácií (diff/link):
- [ ] Top riziká zapísané do brain/registry s review dátumom:

## Kvalitatívna brána (premortem je hotový, len ak)
☐ 4 hlasy vyplnené, min. 1 reálny externý ☐ ≥8 konkrétnych príčin,
všetkých 5 kategórií ☐ matica so skóre ☐ každé riziko ≥6 má mitigáciu,
vlastníka, kill signál a check-in ☐ plán preukázateľne zmenený
☐ zápis v brain/ ☐ celé pod timebox
