---
id: P06
name: DATA-EVENT-CONTRACT
phase: DESIGN
reuses: [docs/architecture/master-data-sourcing-map.md, docs/architecture/antipatterns-log.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P06 — DATA / EVENT CONTRACT

> **Po ľudsky**
> **Čo to je:** Kontrola, že každý „event" a každý údaj má pôvod, autora, čitateľa a
> dôkaz, že naozaj vznikne.
> **Na čo to je:** Najdrahšia chyba v agentných systémoch je „event sa vytvorí" bez toho,
> že ho niekto vytvára. Druhá je vymyslené číslo, keď zdroj nie je pripojený.
> **Čo potrebuje:** architektúru (P05) a `master-data-sourcing-map.md`.
> **Čo ti vráti:** tabuľku trigger → event → writer → reader → stav → idempotencia → audit.
> **Nepoužívaj, keď:** zmena nečíta ani nezapisuje žiadne dáta ani eventy.

## PROMPT

```text
ROLA: Data Engineer + Security Engineer.

1. ZDROJ DÁT: pred stavbou čohokoľvek, čo závisí od dát, nájdi zdroj v
   docs/architecture/master-data-sourcing-map.md. Zdroj nie je v mape → STOP a zapíš ho ako
   OTVORENÚ NEZNÁMU. Nikdy nehádaj zdroj. Nescrapuj osobné údaje (GDPR). Vlastníkov z katastra
   len cez zmluvu s ÚGKK. Portály: len fakty o inzeráte, robots.txt/ToS, radšej oficiálne API.
2. GDPR BRÁNA: ak sa dotýkaš externých alebo osobných údajov, zapíš právny základ
   (čl. 6(1)(f) + balancing test) PRED implementáciou. Skill gdpr-advisor z CLAUDE.md v repe
   NEEXISTUJE (AP-024) — právny základ zapíš ručne a povedz, že skill chýbal.
3. NEPRIPOJENÝ ZDROJ: stav „vypočítané z {zdroj}", nikdy vymyslené číslo.
4. EVENTY — pre každý uveď: TRIGGER · EVENT · SOURCE · SCHEMA · WRITER (cesta:riadok, kto ho
   volá) · READER · STATE TRANSITION · IDEMPOTENCY · RECOVERY · AUDIT.
   „Event bude vytvorený" nie je odpoveď. Odpoveď je: KTO, KDE, KEDY a AKO sa to overí.
5. PII do LLM: surový telefón/e-mail nikdy k modelu (redakcia pred volaním — pozri
   apps/crm/src/lib/ai/sanitize.ts a opravu P0 v #750).

VÝSTUP: tabuľka eventov + zoznam zdrojov so stavom (NOT_IN_MAP | MAPPED | CONNECTED) +
zoznam OTVORENÝCH NEZNÁMYCH.
```
