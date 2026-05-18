# Revolis.AI — pre-mortem mapa → mitigácie a kontrolný zoznam

**Účel:** znížiť riziká z analýzy „rok 2027, projekt zlyhal“. Technickú časť rieši kód + migrácie; obchod, právne a adopciu musí vlastniť vedenie.

**Súvisiace súbory v repozitári**

- ONE thing pitch + add-on + ďalší AI povrch → [`product-one-thing.md`](./product-one-thing.md)
- Vlastníctvo modulov → [`tech-ownership.md`](./tech-ownership.md)
- GDPR (prevádzka) → [`gdpr-operational-checklist.md`](./gdpr-operational-checklist.md)
- Stránka v aplikácii (skratka pre tím) → `/settings/operational-trust`

---

## Tri záchranné princípy

1. **ONE thing** — jeden jasný dôvod kúpy pred rozširovaním (Sc. 1).
2. **Maklér ako hrdina** — metriky ako koučing + transparentné pravidlá (Sc. 2).
3. **Explainability** — krátke „prečo“ + možnosť povedať „nesedí“ pri AI (Sc. 3).

---

## Čo je hotové v produkte (kód / infra)

- [x] **Sc. 3** — Triáž v ľudskej reči (`AiTriageExplainBlock`, `ai-triage-explain-utils`).
- [x] **Sc. 3** — Spätná väzba k triáži: `ai_triage_feedback` + `POST /api/ai/triage-feedback` + Áno/Nie v UI (s `leadId`).
- [x] **Sc. 3** — Metriky behu triáže v DB: `ai_triage_run_metrics` + `/api/ai/triage-health` + `/settings/ai-triage`.
- [x] **Sc. 2** — Koučovací text: `/team/analytics`, `/management` (`CoachingNotSurveillanceCallout`).
- [x] **Sc. 7** — Základný prehľad vlastníctva → `docs/tech-ownership.md` (dopĺňaš mená).

---

## Kontrolný zoznam podľa scenárov

### Sc. 1 — Zabila komplexita (all-in-one)

- [x] Napísaný **jednovetný pitch** a oddelenie add-on → [`product-one-thing.md`](./product-one-thing.md)
- [ ] Onboarding skrátený na **1. deň / prvá výhra** (proces, nie len UI).
- [ ] Predajný deck ≤ **15 min** bez nových modulov v prvom mesiaci.

### Sc. 2 — Sabotáž / surveillance

- [x] Koučovací rámec v UI (analýza + management).
- [ ] Dokument **„čo vidí agent vs. manažér“** (1 strana PDF/Notion) + komunikácia na nábor.
- [ ] **Opt-in** alebo jasná politika tímových metrík (právnik + produkt).
- [ ] Osobný **benchmark** (aspoň anonymizovaný aggregate) — roadmap.

### Sc. 3 — AI neveriteľné

- [x] Explainability + feedback pre **AI triáž**.
- [ ] Rovnaký vzor na **ďalší AI povrch** — návrh orchestrátora: **BRI / dôvera na detaile leadu** → [`product-one-thing.md`](./product-one-thing.md) (sekcia Sc. 3).
- [ ] Mesačný **report presnosti / degradácie** pre interný tím (z logov + feedback tabuľky).

### Sc. 4 — GDPR

- [ ] Vlastník compliance (meno) + [`gdpr-operational-checklist.md`](./gdpr-operational-checklist.md) vyplnený.
- [ ] Právny základ / súhlas pre importy a marketingové dotyky.
- [ ] Retencie + proces **export / výmaz** otestovaný na stagingu.

### Sc. 5 — Platí šéf, makléri nie

- [ ] **Champion maklér** menovaný v každej pilotnej kancelárii.
- [ ] Metrika **WAU maklérov** (nie len platiteľ) v internom dashboarde / reporte.
- [ ] Playbook **prvá výhra do 48 h** (konkrétne 3 kroky).

### Sc. 6 — Malý SK trh

- [ ] Rozhodnutie **expanzia CZ** (áno/nie + termín) + zodpovedná osoba.
- [ ] Ak áno: lokálny kontakt alebo partner do **dátumu X** (doplňte).

### Sc. 7 — Technický dlh

- [ ] Každý kritický modul má **meno** v [`tech-ownership.md`](./tech-ownership.md).
- [ ] Každý šprint **min. 20 %** kapacity na dlh / stabilitu (dohodnuté v tíme).
- [ ] Multi-tenant invarianty v **PR šablóne** (skontrolovať `agency_id` / RLS).

---

## Pre zakladateľa / CEO — čo nevie urobiť len kód

Zoradené podľa priority dopadu:

1. **Kvóty Supabase / billing** — vyriešiť prekročenie limitov (Organisation billing).
2. **ONE thing pitch** — schváliť / použiť text v [`product-one-thing.md`](./product-one-thing.md) v obchode.
3. **Meno compliance vlastníka** + GDPR checklist (DPO alebo externý právnik).
4. **Champion + WAU** adopcia maklérov (Sc. 5).
5. **CZ / expanzia** rozhodnutie a vlastník (Sc. 6).
6. **Školenie transparentnosti** metrík (Sc. 2) — čo manažér vidí.
7. **Pilot s jednou kanceláriou** bez nových modulov 30 dní (Sc. 1).

*(Rovnaký zoznam je v aplikácii na `/settings/operational-trust`.)*
