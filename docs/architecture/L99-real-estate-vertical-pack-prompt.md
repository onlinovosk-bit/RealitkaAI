---
title: "L99 — Real Estate Vertical Business Pack (Capability Architecture)"
project: Revolis.AI
type: master-prompt
status: ready
created: 2026-06-18
tags: [revolis, L99, vertical-pack, capabilities, real-estate, master-prompt]
related:
  - "[[revolis-constitution-v2]]"
  - "[[kontrolor-SKILL]]"
  - "[[master-data-sourcing-map]]"
  - "[[L99-master-prompt-v2]]"
---

# L99 MASTER PROMPT — Real Estate Vertical Business Pack

## ZÁMER (Intent, nie prompt)
Z case study (renetrcka.cz, AI Summit) nestaviame "AI pre makléra". Staviame
**Vertical Business Pack** ako vrstvu nad existujúcim Revolis Engineering OS:
zdieľané capabilities (copywriter, designer, web builder, campaign, follow-up…)
+ realitný balík = konfigurácia workflow/šablón/knowledge. Tá istá architektúra
neskôr poslúži pre iné odvetvia. KAŽDÁ capability beží pod Engineering OS
(audit, quality gate, cost tracking, human approval, learning) — maklér vidí
"Vytvor prezentáciu", pod kapotou beží enterprise-grade pipeline.

## ŽELEZNÉ PRAVIDLÁ (platia na KAŽDÚ capability)
1. **Postav PO BALÍKOCH, nie všetko naraz.** 1 capability = 1 PR sekvencia
   (alebo malá séria). Žiadny mega-diff. Done = artefakt + zelené CI (AP-009).
2. **Stavaj z REÁLNYCH dát, nie z hádania** (AP-003). Capability, ktorá nemá
   reálny vstup, sa NESTAVIA — ide do backlogu s podmienkou odomknutia.
3. **Žiadne fiktívne výstupy** (AP-001). Pricing/scoring/analýza zobrazí len to,
   čo má reálny podklad; inak čestne "nedostatok dát", nie vymyslené číslo.
4. **Human approval gate** pred publikovaním čohokoľvek navonok (inzerát, email,
   kampaň). Žiadne auto-send bez schválenia (stála ZAKÁZANÁ akcia).
5. **GDPR brána** pred každou capability, čo sa dotýka osobných údajov
   (master-data-sourcing-map). Žiadne PII scraping, žiadny stealth lead-gen.
6. **Kontrolór + meta-režimy** pred prijatím; **Ústava** pred "build" (timing +
   customer-pay veto). Capability, čo neprejde Ústavou pri 1 zákazníkovi → backlog.
7. Každá capability dostane: workflow versioning, audit trail, cost tracking,
   quality gate, learning hook — ale LIGHT (nie enterprise dashboard pri 1 RK).

## SEKVENCIA PODĽA PRIPRAVENOSTI DÁT (toto je to L99 rozhodnutie)
Capabilities sa delia podľa toho, či MAJÚ vstupné dáta TERAZ:

### VLNA 1 — STAVITEĽNÉ TERAZ (vstup = zákazka z UC API, ktorú už máš)
Tieto nepotrebujú klientov/leady, len zákazku → reálny výstup. Najvyššia hodnota,
lebo demonštrujú produkt na reálnych dátach Smolka.
- **Listing Generator** — zákazka (UC) → headline, popis, SEO, meta. Z reálnych
  polí (title, description, langData, ceny, plochy). Human approval pred publish.
- **Property Microsite / Sales Web** — zákazka → samostatný web na nehnuteľnosť
  (hero, fotky, popis, kontakt). "Web na míru pre každú zákazku."
- **Visual / Banner Factory** — zákazka → bannery (Na predaj/Znížené/Predané)
  v jednotnom brand style. Stavové vizuály.
- **Presentation Builder** — zákazka → owner/buyer deck (PDF/PPT).
- **Brand Guardian + Quality Reviewer** — kontroluje KAŽDÝ výstup vyššie pred
  schválením (tón, farby, logo, gramatika, právne texty). Toto je Core, nie nice-to-have.

### VLNA 2 — PO SELIGA EXPORTE (vstup = klienti + obhliadky)
Odomkne sa, keď doraziaSeligove klientske dáta. NESTAVAŤ skôr (AP-003).
- **CRM Intelligence light** — práca s reálnymi klientmi (nie scoring na prázdnych).
- **Follow-up Engine** — po obhliadke/kontakte: pripraviť návrh odpovede, human odošle.
- **Newsletter / Campaign** — segmentácia reálnej klientskej databázy.
  Vždy human approval pred odoslaním.

### VLNA 3 — BACKLOG (chýba dátový zdroj alebo je to predčasné pri 1 RK)
Odomkne: reálne lead dáta + viac zákazníkov. NESTAVAŤ teraz.
- Lead Scoring / Buyer Intent / Next Best Action (nemá z čoho učiť — AP-001).
- AI Pricing / Comparable Engine (kataster vlastníci len cez ÚGKK; portály = GDPR).
- Lead Hunter cez Ads/portály (právne + portal-scraping zakázané).
- Digital Twin, Capability Registry, Process Mining, Self-healing, Evolution Engine
  (infraštruktúra veľkej firmy — cargo cult pri 1 zákazníkovi).

## ARCHITEKTÚRA (ako to zložiť, nie hardcoded agenti)
```
Engineering OS (máš)
└── Vertical Pack: Real Estate
    ├── Shared Capabilities (copywriter, designer, web, campaign, presentation, QA)
    │     ↑ použiteľné aj pre iné vertikály
    └── Real Estate config (workflow, šablóny, knowledge, business pravidlá)
```
- Capability = workflow + prompt(y) + quality gate + audit + cost + learning hook.
- Coordinator = orchestračná vrstva (rozbije úlohu → vyberie capability → human gate
  → výstup). NIE nový agent — vrstva nad tým, čo máš.
- Shared capabilities sa NEduplikujú per vertikála — realitný balík je len konfigurácia.

## VÝSTUP PRE KAŽDÚ CAPABILITY (Definition of Done)
Capability je hotová len ak má: workflow + reálny vstup (nie mock) + quality gate
prejde + human approval gate + audit do logu + zelené CI + Kontrolór PASS.
"Funguje na demo dátach" ≠ hotové. "Funguje na Smolkovej reálnej zákazke" = hotové.

## PRVÝ KROK (keď ideš stavať)
NEZAČÍNAJ všetkým. Začni **Listing Generator** (Vlna 1) z jednej reálnej zákazky
z UC API: zákazka → popis + headline + SEO, human schváli, publish. Jedna
capability, end-to-end, na reálnych dátach. Keď drží, pridaj ďalšiu z Vlny 1.
Tým demonštruješ produkt Smolkovi na JEHO dátach — a to je to, čo predáva ďalším RK.

## ČO TENTO PROMPT NEDOVOLÍ
- Postaviť 40 capabilities naraz (→ slop, AP-007/AP-009).
- Scoring/pricing na dátach, ktoré nemáš (→ AP-001/AP-003).
- Auto-send emailov/kampaní bez human approval (→ zakázaná akcia).
- Lead-gen cez scraping/stealth (→ GDPR, zakázané).
- Stavať Vlnu 3 infraštruktúru pred Vlnou 1 výstupmi (→ cargo cult).
