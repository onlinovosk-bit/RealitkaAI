# PREMORTEM: Operator Dashboard v1 (cross-agency prehľad)

**Cieľová cesta:** `docs/premortems/2026-07-29-operator-dashboard.md`
**Zdroj (Build Package):** `docs/briefs/overnight/build-package-operator-dashboard.md` §7
**Podľa šablóny:** `docs/templates/premortem.md` (extrakcia PREMORTEM sekcie z balíka)

## KROK 3 — Imaginácia zlyhania
Je **28.08.2026**. Operator dashboard zlyhal, pretože riziká nižšie sa materializovali
bez dostatočnej mitigácie v pláne.

## KROK 5 — Matica P×Z (Build Package §7)

| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | MULTI-TENANT: bug v agregácii ukázal dáta jednej kancelárie pri druhej | 2 | 3 | **6** | agregáty len per `agency_id` s explicitným GROUP BY + test izolácie s 2 seed agentúrami; Kill: akýkoľvek cross-tenant únik → route okamžite vypnutá flagom |
| 2 | PRÁVO: prezeranie zákazníckych PII bez dôvodu a záznamu | 2 | 3 | **6** | agregát-first, drill-down vyžaduje dôvod + audit; bez auditu sa funkcia nenasadzuje |
| 3 | Metriky vyzerali presne, ale stáli na chýbajúcich dátach (reakcia 0 % namiesto „bez dát") | 3 | 2 | **6** | povinné rozlíšenie `unavailable` vs `0`; test na prázdnych dátach |
| 4 | VÝKON: full-scan leadov pri každom otvorení, DB spomalila prod | 2 | 3 | **6** | indexy + agregáty; meranie trvania do heartbeat |
| 5 | Dashboard sa stal ďalším miestom, kde treba ručne udržiavať čísla kampaní | 3 | 2 | **6** | v1 vedome len to, čo je v DB; Ads/GA4 sekcia môže byť prázdna, nesmie byť ručne dopĺňaná viac než 1× denne |
| 6 | ROLLBACK: vypnutie route nechalo audit tabuľku v polovičnom stave | 1 | 2 | 2 | audit zápis je nezávislý insert, žiadna transakčná väzba na UI |

## Poznámka k bráne
Riziká so skóre **≥6** (#1–#5) vyžadujú mitigáciu v implementačnom PR pred founder GO
na PROD zapnutie `OPERATOR_DASHBOARD_ENABLED`. Schéma platform-admin a audit drill-down
(v1.1) sú samostatné founder brány.
