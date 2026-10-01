---
name: strategic-analysis
description: >
  Strategická analýza pred väčšími rozhodnutiami (integrácia, migrácia, smer
  produktu). Fáza 1: Weakness Finder — konkrétne slabiny. Fáza 2: Opportunity
  Gen — viac variantov s tradeoffmi. Použi pred Ústavou/Kontrolór meta-režimmi
  pri rozhodnutiach mapovaných v ultrathink-closed-loop-revolis.md.
tags: [strategy, analysis, decision-support, revolis]
version: 1.0
---

# STRATEGIC ANALYSIS — pred rozhodnutím

> Nie je to exekúcia ani verifikácia. Je to **analýza medzi kontextom a rozhodnutím**.
> Použi pri väčších rozhodnutiach (nová integrácia, migrácia, produktový smer).
> Po analýze → Ústava (12 otázok) → Kontrolór (+ meta-režimy ak treba).

## KEDY POUŽIŤ

- Nová integrácia / externý systém (napr. portál, UC, Nehnuteľnosti.sk)
- Migrácia schémy alebo produkčných dát
- Rozhodnutie BUILD vs BACKLOG vs VALIDATE
- **NIE** pri bežnom bugfixe alebo 1-súborovom PR

---

## FÁZA 1 — WEAKNESS FINDER

**Úloha:** Nájdi **konkrétnu** slabinu v pláne alebo v predpokladoch — nie vágnu kritiku.

Pre každý navrhovaný smer odpovedz:

1. **Čo presne môže zlyhať?** (technicky, právne, obchodne — konkrétne)
2. **Na akom neoverenom predpoklade stojí?** (označ FAKT / PREDPOKLAD / NEZNÁME)
3. **Kde je single point of failure?** (jeden vendor, jeden cron, jeden founder)
4. **Čo konkurencia / klient uvidí ako riziko?**
5. **Čo sme už raz pokazili podobne?** (pozri `antipatterns-log.md`, `decisions.md`)

**Výstup fázy 1:** zoznam **3–5 konkrétnych slabín** (nie „môže byť zložité").

---

## FÁZA 2 — OPPORTUNITY GEN

**Úloha:** Generuj **viac variantov** — minimum 3 — nie jeden „správny" plán.

Pre každý variant uveď:

| Pole | Obsah |
|------|--------|
| **Názov** | krátky label (napr. A: MVP webhook, B: batch import, C: VALIDATE only) |
| **Čo dá klientovi** | outcome, nie feature list |
| **Náklady** | čas, údržba, právne, infra |
| **Reverzibilita** | ľahko / ťažko / nemožné |
| **Biznis brána** | prejde Ústavou? (timing / pay veto) |
| **Prvé overenie** | najkratší dôkaz, že variant má zmysel (≤1 deň) |

**Výstup fázy 2:** tabuľka variantov + **odporúčaný variant** s 1 vetou prečo (nie dlhá obhajoba).

---

## VÄZBA NA OSTATNÉ NÁSTROJE

| Krok | Nástroj |
|------|---------|
| Pred fázou 1 | Kontext (git, schema, docs, `master-data-sourcing-map.md`) |
| Fáza 1–2 | **tento skill** |
| Po fáze 2 | `revolis-constitution-v2.md` (12 otázok) |
| Pred merge/build | **Kontrolór** (body 1–10 + meta ak integrácia) |
| Po implementácii | Verifikácia (CI, smoke, audit query) + `decisions.md` |

---

## ČO TENTO SKILL NEROBÍ

- Neimplementuje kód
- Nerozhoduje sám (odporúča variant — founder rozhodne)
- Nenahradzuje Kontrolór (analýza ≠ adversariálna verifikácia)
- Neobchádza GDPR gate ani data-sourcing map
