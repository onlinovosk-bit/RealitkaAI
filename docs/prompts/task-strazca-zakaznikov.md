# Zadanie — Strážca zákazníkov (denný alarm na ticho)

**Režim:** vetva + PR + STOP. **ŽIADNY MERGE.** Merge robí výhradne founder.
CONSTITUTION: soft 400 / hard 600 riadkov. Žiadny scope navyše.

## Prečo

2. 9. 2026 sa zistilo, že platiacemu zákazníkovi (Reality Smolko, 199 €/mes.)
**nedošiel do CRM ani jeden dopyt od 27. 7.** — päť týždňov. Zároveň sa
**ani jeden z jeho 12 maklérov nikdy neprihlásil.** Nikto o tom nevedel, kým
zákazník sám nezavolal.

Chyba nebola v kóde. Chyba bola, že **ticho nikomu nezasvietilo.**

Cieľ: denný alarm, ktorý foundera upozorní skôr, než si to všimne zákazník.

## KROK 0 — najprv grepni repo (povinné)

V repe už existujú: `/api/cron/guardian-run`, `/api/cron/guardian-digest`,
`/api/cron/heartbeat-check`, `/api/cron/morning-brief`, `lib/operator/gather.ts`
(počíta health score naprieč tenantmi), `lib/operator/health-score.ts`.

**Zisti, či sa to nedá dosiahnuť rozšírením niečoho z toho.** Ak áno, rozšír to
a nezakladaj nový modul. Do PR popisu napíš, čo si našiel a prečo si sa
rozhodol tak, ako si sa rozhodol. Nový cron zakladaj až vtedy, keď existujúce
nestačia.

*(Dvakrát v auguste sa stalo, že sa staval modul, ktorý už v repe bol.)*

## Čo má strážca merať — na každú agentúru

| Signál | Prah | Stupeň |
|---|---|---|
| dní od posledného leadu | > 7 | 🔴 ČERVENÁ |
| dní od posledného leadu | > 3 | 🟠 ORANŽOVÁ |
| dní od posledného prihlásenia vlastníka | > 14 | 🟠 ORANŽOVÁ |
| podiel účtov, ktoré sa **nikdy** neprihlásili | > 50 % | 🟠 ORANŽOVÁ |
| žiadne prihlásenie nikoho v tíme za 30 dní | — | 🔴 ČERVENÁ |

Prahy daj do konštánt na jednom mieste, nie roztrúsene po kóde.

**Platiace agentúry majú prednosť** — v reporte hore, a ticho u platiaceho
zákazníka je vždy o stupeň vyššie než u neplatiaceho.

Zdroje: `public.leads.created_at`, `public.profiles`,
`auth.users.last_sign_in_at` (cez `profiles.auth_user_id`),
`agencies.plan` / `manual_plan`.

**Pozor:** `profiles.id ≠ auth.uid()` — 19 z 23 profilov má `auth_user_id` NULL,
4 ho majú odlišné od `id`. Join rob cez `auth_user_id`, nikdy cez `id`.

Vylúč sandbox a systémové tenanty rovnako, ako to robí
`parseOperatorAgencyExcludeList()` — nevymýšľaj druhý zoznam.

## Výstup

1. **Denný záznam** do tabuľky (migračný SÚBOR, **NEAPLIKOVAŤ** — prod história
   je v drifte, `db push` je zakázaný; postup pre foundera do PR popisu).
2. **Riadok v rannom reporte** o 7:00 — iba keď je čo hlásiť. Žiadny šum
   typu „všetko v poriadku" každý deň.
3. **Panel v operator dashboarde**, ak sa tam prirodzene zmestí.

## ZAKÁZANÉ

- **Žiadny e-mail zákazníkovi.** Ani upozornenie, ani „chýbate nám".
  Strážca hlási **výhradne founderovi**. Platí pravidlo: drafty áno, send nikdy.
- Žiadna zmena RLS ani aplikácia migrácie.
- Žiadny zápis do `memory/`.
- Endpoint musí byť za `Bearer CRON_SECRET` (vzor: `/api/inbound/gmail-pull`),
  prípadné UI za `is_platform_admin` s kontrolou **pred** service-role klientom.

## Testy

- jednotkové na vyhodnotenie prahov (hraničné hodnoty 3, 7, 14, 30 dní)
- test, že agentúra bez jediného leadu a bez prihlásení je ČERVENÁ
- test, že platiaca agentúra je v poradí pred neplatiacou
- test, že join ide cez `auth_user_id` a nie cez `id`
- verifikačný test, že endpoint bez `CRON_SECRET` vracia 401

## Akceptačné kritérium

Spätne spustený nad dneškom musí **Reality Smolko označiť ČERVENOU** z dvoch
dôvodov naraz: 37 dní bez leadu a 12 z 12 účtov bez jediného prihlásenia.
Ak ho neoznačí, zadanie nie je splnené.
