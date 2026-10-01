# BUILD ORDER — `onboard-agency` skript (Stripe princíp: friction reduction)

**Cieľ:** 7 ručných onboarding krokov (overených na demo tenante B–G,
2026-07-09) zložiť do jedného idempotentného skriptu + runbooku. Plní founding
sľub „onboarding do 48 h" a odstraňuje founder-as-machine z onboardingu.

**Filter:** prinesie zákazníka? ÁNO (sľub 48 h nesplniteľný ručne pri 2+
súbežných). Najmenší overiteľný zásah? ÁNO (skladá EXISTUJÚCE overené kroky,
nič nové nevymýšľa).

**PRAVIDLÁ:** reuse-first — skript VOLÁ existujúce kusy (createProfile pattern,
demo-bootstrap-profiles.cjs ako predloha), neduplikuje logiku. Dry-run default,
`--execute` explicitný. Žiadny auth/invite krok (konsent, 1b samostatne).
Vetva + PR + CI.

**Status:** **Running** 2026-07-11 — dry-run + prod TEST `--execute` (verify 2 profiles, 1 mailbox) + cleanup OK. Fix: `agencies.email` odstránené (stĺpec na prod neexistuje).

---

## ROZHRANIE

```bash
node apps/crm/scripts/onboard-agency.cjs \
  --name "Reality XYZ" \
  --owner-email "majitel@xyz.sk" \
  [--owner-name "Rastislav Smolko"] \
  [--makleri "Novák:novak@xyz.sk,Kováč:kovac@xyz.sk"] \
  [--billing stripe|manual] \
  [--seat-tier solo|team|office] \
  [--manual-plan market_vision] \
  [--execute]
```

Default: `billing=stripe`, `seat-tier=team`. Manual + `market_vision` = len Smolko výnimka.

## KROKY SKRIPTU (mapované na overené B–G)

1. **Agentúra:** INSERT do `agencies` (SELECT-check name/slug duplicitu najprv).
2. **Owner profil:** krok B pattern — `profiles` riadok, `role=owner`,
   `auth_user_id` NULL (auth až po pozvánke, mimo skriptu).
3. **Makléri:** krok C pattern (`demo-bootstrap-profiles` predloha), idempotentne per email.
4. **Inbound alias:** krok G — `<slug>-<4hex>@revolis.ai`, INSERT `inbound_mailboxes`.
5. **Verify blok:** counts + checklist ručných krokov.

## VÝSTUP

JSON report + human súhrn s aliasom a ručnými krokmi.

## ACCEPTANCE (Running)

Dry-run → execute na TEST agentúre → verify → cleanup. Nie na Smolko/demo.

**ANTI-DRIFT:** žiadne auth účty, žiadne e-maily von, žiadny Stripe API automat.
