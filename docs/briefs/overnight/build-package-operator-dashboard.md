# BUILD PACKAGE: Revolis Operator Dashboard (cross-agency prehľad)

**Cieľová cesta:** `docs/briefs/overnight/build-package-operator-dashboard.md`
**Mockup:** `docs/design/revolis-operator-dashboard.html`
**Kategória:** Core Platform — dokázaná opakovaná manuálna práca (denná SQL
kontrola per agentúra, rastie s každým zákazníkom).
**POZOR — bezpečnostne citlivé:** prvý zámerne cross-tenant pohľad v systéme.

---

## 1. VISION & BUSINESS
Founder dnes kontroluje stav každej kancelárie ručne v SQL. Pri 2 zákazníkoch
to zaberie minúty, pri 10 je to nemožné. Dashboard nahrádza ručnú kontrolu
jedným pohľadom: *čo dnes potrebuje pozornosť, ako si stojí ktorá kancelária,
fungujú kampane.*
**User story:** „Ráno otvorím jednu stránku a do 60 sekúnd viem, ktorý
zákazník je v riziku a či kampane zarábajú."
**Väzba na princípy:** posilňuje P4 (poznať vlastnú chybovosť) a P5 (rýchlosť
slučky). Oslabuje P9 v tom, že vytvára cross-tenant prístup — kompenzované
agregát-first návrhom a auditom (viď 3).

## 2. SPEC
**F1 Attention feed (jadro):** zoradený zoznam „čo potrebuje pozornosť dnes"
podľa dopadu, nie času. Zdroje signálov: nekontaktované leady s vysokou
prioritou (Guardian), nedokončený onboarding, kampaň v prvom týždni,
widget nedostupný, prekročený prah nákladu.
**F2 Tabuľka kancelárií:** stav (beží/onboarding/systém), kontakty 7 d
a celkom, trend 14 d, podiel reakcií do 24 h, počet bez reakcie, obchody
won/lost, otvorené nálezy strážcu, kompozitné skóre zdravia.
**F3 Panel kampaní:** A/B varianty (kontakty per variant), spend dnes vs
limit, cena za kontakt, počet nezavolaných voči poistke.
**F4 Platform health strip:** stav widgetov, posledný beh crona/strážcu,
či je denný súhrn zapnutý.
**F5 Drill-down:** klik na signál otvorí detail — **jediné miesto, kde sa
zobrazujú osobné údaje**, a zapíše sa audit záznam.
**NF1** Agregát-first: default view neobsahuje žiadne PII.
**NF2** Cieľ načítania < 2 s pri 50 agentúrach; dotazy indexované, žiadny
full-scan leadov v request ceste.
**NF3** Prístup výhradne pre platform-admin, nikdy pre agency rolu.

## 3. ARCHITECTURE (najdôležitejšia sekcia)
- Nová route `/operator` v existujúcej CRM app, mimo agency layoutu.
- **Autorizácia:** platform-admin príznak na profile (nie agency role);
  middleware odmietne všetko ostatné 404 (nie 403 — neprezrádzať existenciu).
- **Prístup k dátam:** agregačné SQL views/RPC s `security definer`,
  ktoré vracajú **len počty a metriky per agency_id** — nikdy riadky s PII.
  Drill-down je samostatná RPC vyžadujúca dôvod (enum) a zapisujúca audit.
- **Audit:** rozšíriť existujúci `integrity_alerts` / audit vzor —
  kto, kedy, ktorý tenant, ktorý dôvod. Bez auditu funkcia nespĺňa DPA.
- **Systémové tenanty** (demo, sandbox) sú vždy oddelené a mimo hodnotenia
  — riadi to allowlist ako pri Guardianovi.
- Reuse: `dashboard-insights-gather` vzor pre paralelné načítanie sekcií
  (už existuje `Promise.all` pattern).

## 4. DATA
**Žiadne nové tabuľky.** Iba read-only agregačné views nad: `leads`,
`lead_events`, `deal_outcomes`, `guardian_findings`,
`moat_ai_recommendations`, `agencies`, `valuation_tenants`.
Metriky, ktoré dnes NEIDÚ (zapísať ako známy dlh, nezobrazovať vymyslené):
- **Reakcia do 24 h** — vyžaduje `lead_events` zápis pri kontakte
  (dnes 0 riadkov → zobraziť „zatiaľ bez dát", nie 0 %).
- **Presnosť odhadov** — vyžaduje `valuation_estimates` (neexistuje).
- **Spend / kliky** — Ads a GA4 sú externé; v1 ručný vstup alebo prázdne.

## 5. UI
Podľa mockupu: sidebar (Dnes / Kancelárie / Kampane / Výkon / Platforma /
Obchod), health strip, attention feed, tabuľka, panely kampaní.
Prázdne stavy hovoria pravdu („zatiaľ bez dát", „mimo hodnotenia"),
nikdy nula namiesto neznáma.

## 6. TESTING & ACCEPTANCE / DoD
- RLS/authz: agency user na `/operator` → 404; platform-admin → 200.
- Agregačné view nevracia žiadny stĺpec s PII (test na schéme výstupu).
- Drill-down bez dôvodu → odmietnutý; s dôvodom → audit riadok +1.
- Systémové tenanty vylúčené z hodnotenia (fixture s demo agentúrou).
- Výkon: seed 50 agentúr × 5 000 leadov → načítanie < 2 s.
- DoD: CI zelené · `brain:check` · registrácia v brain registry ·
  žiadna nová tabuľka · mockup a realita sa nerozchádzajú v názvoch metrík.

## 7. PREMORTEM (je 28.08.2026, dashboard zlyhal, pretože…)
| # | Riziko | P | Z | Sk | Mitigácia / Kill |
|---|---|---|---|---|---|
| 1 | MULTI-TENANT: bug v agregácii ukázal dáta jednej kancelárie pri druhej | 2 | 3 | **6** | agregáty len per `agency_id` s explicitným GROUP BY + test izolácie s 2 seed agentúrami; Kill: akýkoľvek cross-tenant únik → route okamžite vypnutá flagom |
| 2 | PRÁVO: prezeranie zákazníckych PII bez dôvodu a záznamu | 2 | 3 | **6** | agregát-first, drill-down vyžaduje dôvod + audit; bez auditu sa funkcia nenasadzuje |
| 3 | Metriky vyzerali presne, ale stáli na chýbajúcich dátach (reakcia 0 % namiesto „bez dát") | 3 | 2 | **6** | povinné rozlíšenie `unavailable` vs `0`; test na prázdnych dátach |
| 4 | VÝKON: full-scan leadov pri každom otvorení, DB spomalila prod | 2 | 3 | **6** | indexy + agregáty; meranie trvania do heartbeat |
| 5 | Dashboard sa stal ďalším miestom, kde treba ručne udržiavať čísla kampaní | 3 | 2 | **6** | v1 vedome len to, čo je v DB; Ads/GA4 sekcia môže byť prázdna, nesmie byť ručne dopĺňaná viac než 1× denne |
| 6 | ROLLBACK: vypnutie route nechalo audit tabuľku v polovičnom stave | 1 | 2 | 2 | audit zápis je nezávislý insert, žiadna transakčná väzba na UI |

## 8. ROLLBACK
Feature flag `OPERATOR_DASHBOARD_ENABLED` (default false do overenia).
Vypnutie = 404 na route, žiadny DB zásah. Views sú read-only, pri
rollbacku sa nedropujú.

## 9. MONITORING
Trvanie načítania a počet drill-down udalostí do platform heartbeat.
0 otvorení za 7 dní pri živej prevádzke = advisory (nepoužívaná funkcia).

## 10. MEMORY UPDATE
`brain/decisions`: (1) „Operator dashboard = agregát-first, cross-tenant
prístup len s auditom" (review +90 d); (2) „platform-admin je samostatná
rola, nie agency role". Registry: route + views + audit rozšírenie.

## 11. RELEASE CHECKLIST
☐ founder GO → ☐ deploy s flagom false → ☐ authz testy na prode
(agency user 404) → ☐ zapnutie flagu → ☐ vizuálna kontrola prázdnych
stavov → ☐ zápis do brain.

---

## FÁZOVANIE (odporúčanie Boardu)
**v1 (jedna noc):** F1 attention feed + F2 tabuľka + F4 health strip nad
dátami, ktoré existujú. Bez kampaní, bez drill-downu do PII.
**v1.1:** drill-down s auditom · **v1.2:** kampane (po prvom vyhodnotení
Ads) · **v2:** metriky presnosti odhadov (až po `valuation_estimates`).
Dôvod fázovania: v1 rieši 80 % dnešnej ručnej práce a nesie najmenšie
bezpečnostné riziko.
