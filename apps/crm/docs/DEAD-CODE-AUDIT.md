# Dead Code Audit — `apps/crm/src/components`

**Dátum:** 2026-06-05  
**Metóda:** Export scan + import count (basename heuristic)  
**Poznámka:** Basename matching **podceňuje** importy cez `@/components/...` — každý kandidát overiť ručne pred zmazaním.

---

## Top 20 kandidátov (najmenej importov)

| # | Komponent | Posledný commit | Importy* | Odporúčanie |
|---|-----------|-----------------|----------|-------------|
| 1 | `onboarding/GoalCards.tsx` | 2026-04-10 | 0† | **keep** — používa `onboarding/page.tsx` |
| 2 | `notifications/NotificationList.tsx` | 2026-03-26 | 0† | **keep** — vlastný test + budúci feed |
| 3 | `notifications/DemoNotificationTrigger.tsx` | 2026-03-25 | 0 | **investigate** — demo-only trigger |
| 4 | `onboarding/RevolisNavSpriteIcon.tsx` | 2026-04-20 | 0 | **investigate** — možno nahradené SVG |
| 5 | `outreach/followup-sequence-panel.tsx` | 2026-03-27 | 0† | **keep** — `outreach/page.tsx` |
| 6 | `outreach/campaign-builder.tsx` | 2026-05-07 | 0† | **keep** — `outreach/page.tsx` |
| 7 | `onboarding/RoundtableOnboardingSection.tsx` | 2026-04-17 | 0 | **investigate** |
| 8 | `marketing/stealth-funnel/StealthFunnelClient.tsx` | — (untracked) | 0 | **keep** — nový stealth funnel |
| 9 | `marketing/UnifiedDemo.tsx` | 2026-05-22 | 0† | **keep** — `demo/page.tsx`, `LiveDemoExperience` |
| 10 | `marketing/SmolkoDemo.tsx` | 2026-06-04 | 0† | **keep** — `(marketing)/smolko/page.tsx` |
| 11 | `matching/log-match-button.tsx` | 2026-03-25 | 0† | **keep** — `matching/[id]/page.tsx` |
| 12 | `matching/recalculate-matches-panel.tsx` | 2026-03-25 | 0 | **investigate** — matching UI |
| 13 | `matching/property-match-panel.tsx` | 2026-03-25 | 0 | **investigate** |
| 14 | `matching/matches-table.tsx` | 2026-03-25 | 0 | **investigate** |
| 15 | `properties/properties-filters.tsx` | 2026-03-25 | 0 | **investigate** |
| 16 | `price-trail/PriceTrailPanel.tsx` | 2026-04-26 | 0 | **investigate** — price trail feature |
| 17 | `price-trail/PriceChart.tsx` | 2026-04-26 | 0 | **investigate** |
| 18 | `properties/properties-page-client.tsx` | 2026-05-26 | 0† | **keep** — properties route |
| 19 | `properties/property-create-form.tsx` | 2026-03-25 | 0 | **investigate** |
| 20 | `properties/properties-workspace.tsx` | 2026-03-25 | 0 | **investigate** |

\* Počet importov podľa basename grep — môže byť 0 aj pri aktívnom použití.  
† Ručne overené — **nie je mŕtvy kód**.

---

## Skutoční kandidáti na zmazanie (po ručnom review)

| Komponent | Dôvod | Akcia |
|-----------|-------|-------|
| `notifications/DemoNotificationTrigger.tsx` | Demo/notif test helper, žiadny page import | **investigate** → delete ak demo flow zrušený |
| `onboarding/RevolisNavSpriteIcon.tsx` | Žiadny import v `src/` | **delete** po potvrdení designu |
| `matching/recalculate-matches-panel.tsx` | Starý matching panel, možno nahradený | **investigate** |
| `matching/matches-table.tsx` | Žiadny page import | **investigate** |

---

## Odporúčaný postup

1. **Nemaž hromadne** — basename heuristic dáva false positives.
2. Pred delete: `rg "ComponentName" apps/crm/src` + overiť dynamic importy.
3. Zmazať najprv komponenty s **0 importov** aj po `@/` path search.
4. Spustiť `npm run build` po každom batchi.

---

## Žiadne súbory neboli zmazané

Toto je audit-only dokument podľa L99-6.
