# ONE thing — prvý mesiac (orchestrácia produktu)

## Jednovetný pitch

**Prvý mesiac predávame:** dennú AI triáž otvorených príležitostí — maklér dostane **jasnú prioritu** (Vysoká / Stredná / Nízka), **krátke vysvetlenie v slovenčine** a systém pri výpadku AI **nedegraduje na nič** (záložné skóre), takže „dnešných 10“ a dashboard nikdy nie sú prázdne kvôli modelu.

*(Jedna veta na obchod: „Revolis v prvom mesiaci zaisťuje, že maklér každé ráno vie presne, na ktorých leadoch zarobiť čas — s rozumiteľným dôvodom a bez čiernej skrinky.“)*

## Čo je v prvom mesiaci jadro (ONE thing)

| Áno — súčasť ponuky mesiac 1 | Poznámka |
|------------------------------|----------|
| Automatická triáž (`ai_priority`, `ai_reason`, cron) | Primárna hodnota |
| Explainability v UI (badge, odrážky, záloha) | Dôvera |
| Spätná väzba k triáži (Áno/Nie) | Učenie + pre-mortem Sc. 3 |
| Viditeľnosť behu triáže (`/settings/ai-triage`, metriky) | Prevádzková istota |

## Add-on (nie sú súčasťou ONE-thing pitchu v mesiaci 1)

Označ ich v ponuke výslovne ako **doplnkové moduly** alebo „fáza 2“, aby nedošlo k all-in-one pitchu (pre-mortem Sc. 1).

- Plná náhrada za **klasické CRM** (Pipedrive/Airtable workflow 1:1).
- **Workflow plánovač** ako samostatný produkt.
- **Skrytý výkonnostný audit** maklérov bez koučovacieho rámca.
- **Široké predikčné modely** bez explainability (ďalšie AI vrstvy až po vzore triáže).
- Hlboké **matching / arbitráž** ako hlavný dôvod nákupu v prvom kole.
- **Realvia** a ďalšie integrácie — „zapneme po stabilnej triáži“.

---

## Sc. 3 — Ďalší AI povrch po triáži (návrh orchestrátora)

### Odporúčaná priorita č. 2: **BRI / „dôvera leadu“ na detaile príležitosti**

**Prečo:**

- Maklér tam trávi čas každý deň; ak je číslo „magické“, rýchlo stratí dôveru (pre-mortem).
- Už máte koncept skóre / sales brain v produkte — chýba **rovnaký vzor** ako pri triáži: 2–3 vety v SK + indikátor zálohy + feedback.

### Konkrétny vzor (1 PR = jedna logická zmena)

1. **UI:** komponent typu `AiBriExplainBlock` (alebo zdieľený `AiSignalExplainBlock`) vedľa existujúceho BRI — bez nových grafů, bez surových čísel v hlavnom texte.
2. **Feedback:** rozšírenie **jednej** tabuľky (`ai_model_feedback` s `surface: triage|bri`) **alebo** nová `ai_bri_feedback` — rovnaké API pattern ako `POST /api/ai/triage-feedback`.
3. **Fallback:** ak AI/výpočet zlyhá, zobraziť kontrolovanú hlášku + základ z existujúcich polí (stav, aktivita), nie prázdny panel.
4. **Meranie:** v existujúcich metrikách alebo logoch pridať `surface=bri` pre počty degradácií.

### Alternatívy (poradie po BRI)

| Poradie | Povrch | Dôvod |
|--------|--------|--------|
| 3 | Ranný **morning brief** AI blok | Skupinový kontext, nižšia frekvencia opráv. |
| 4 | **Coaching insight** (`/api/coaching/insight`) | Jedna obrazovka, menej kritické ako BRI pri každom leadovi. |

**Produktové rozhodnutie:** potvrdiť s 2–3 maklérmi z pilotu, či **BRI na detaile** bolov bolí viac než brief — potom icebox ostatné.

---

## Súvisiace dokumenty

- [`premortem-mitigations.md`](./premortem-mitigations.md) — celá mapa rizík  
- [`gdpr-operational-checklist.md`](./gdpr-operational-checklist.md) — compliance prevádzka  
