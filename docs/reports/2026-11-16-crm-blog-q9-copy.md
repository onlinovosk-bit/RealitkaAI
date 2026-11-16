# Otázka 9 — skúšobná doba (PR #956)

**GO:** Founder 16. 11. 2026, dve drobné opravy v `crm-pre-realitnych-maklerov-ako-vybrat`. Draft, `published: false`, never merge.
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/956

## 1) „uvítacie obdobie“ → „skúšobnej doby“

Výraz „uvítacie obdobie“ je vyhradený na iný koncept. 14-dňová skúška sa tak nenazýva.

## 2) „Po skončení sa skúšobná verzia sama vypne“

**Verdikt: FAKT, veta ostáva.** Kód po 14 dňoch vypne zápis (read-only), účet sa nemaže, nič sa nestrhne.

| Tvrdenie | Súbor |
|---|---|
| Po 14 dňoch bez predplatného je stav `limited` | `apps/crm/src/lib/saas-ops.ts` `trialGraceFrom` (komentár: brána, ktorá po 14 dňoch vypne zápis; vetva „Koniec trialu bez karty… Účet sa prepne na čítanie, nič sa nestrhne.“) |
| `limited` → `read_only` | `apps/crm/src/lib/saas-ops.ts` `accessLevelFrom`; `canUseFullApp` v `getSaasOpsSnapshot` |
| Zápisové API/akcie padnú, dáta ostávajú čitateľné | `apps/crm/src/lib/feature-gating.ts` `requireActiveAppAccess` |
| V minúte vypršania je účet len na čítanie; mesiac potom stále `limited`, nie `blocked` | `apps/crm/src/lib/__tests__/trial-no-card.test.ts` |
| Registrácia nezakladá Stripe ID, teda nie je čo zaúčtovať | `trial-no-card.test.ts` číta `bootstrap_self_serve_agency` v `20261006120000_self_serve_signup_foundation.sql` |
| Bez karty | registrácia + bootstrap (žiadny Stripe customer) |

Presnosť slova „vypne“: účet sa **nevymaže**. Vypne sa zápis. To je ten istý slub ako na `apps/crm/src/app/(public)/register/page.tsx` a v `trial-no-card.test.ts`.

„Nič sa neúčtuje automaticky“ je overené rovnakým bootstrapom (žiadne `stripe_subscription_id`).

## Výsledné znenie otázky 9

Revolis môžete vyskúšať 14 dní zadarmo, bez platobnej karty. Po skončení sa skúšobná verzia sama vypne a nič sa neúčtuje automaticky. Overte, či naozaj nemusíte zadávať kartu a čo sa stane s dátami po skončení skúšobnej doby.
