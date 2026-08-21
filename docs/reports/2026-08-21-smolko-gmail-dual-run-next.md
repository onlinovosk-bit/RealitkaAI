# Smolko — Gmail inbound dual-run (stav 2026-08-21)

Kód **#422** je na `main` (`d2f7d0bc`). Live setup ešte nie je hotový — to je
ďalšia zákaznícka linka po stiahnutí branch-delete GO.

## Hotové (repo)

- [x] Merge #422 mock-first Gmail pull
- [x] Runbook: `docs/runbooks/gmail-pull-setup.md`
- [x] Auth verification tests na route / proxy

## Čaká na foundera (secrets + 1 klik)

Podľa runbooku — **Preview first**, nie Production, kým nie je GO:

1. Google Cloud: oddelený OAuth client, scope **iba** `gmail.readonly`
2. Refresh token cez OAuth Playground (vlastné credentials)
3. Gmail label `Revolis` + filter + `Label_…` id
4. Vercel Preview env (CRM):
   - `GOOGLE_GMAIL_INBOUND_CLIENT_ID`
   - `GOOGLE_GMAIL_INBOUND_CLIENT_SECRET`
   - `GOOGLE_GMAIL_INBOUND_REFRESH_TOKEN`
   - `GOOGLE_GMAIL_INBOUND_LABEL_ID`
   - `GOOGLE_GMAIL_INBOUND_AGENCY_ID` (Smolko agency UUID)
   - `GMAIL_INBOUND_PULL_ENABLED=true`
   - `ACQUIRE_SHARED_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`
5. Smoke:
   ```bash
   curl -i -X POST "$PREVIEW/api/inbound/gmail-pull" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   Očakávaj `200` a `posted >= 1` na správe so štítkom.
6. 24–48 h dual-run (forward/alias **nevypínať**)
7. Až potom GO: vypnúť forward / Production

## Draft email Smolkovi (NEODOSLANÉ — founder schvaľuje)

Predmet: Revolis — bezpečnejší príjem dopytov z Gmailu (iba čítanie štítku)

Text:

```
Dobrý deň p. Smolko,

pripravili sme bezpečnejší spôsob, ako Revolis načíta dopyty z Gmailu:
namiesto preposielania celej schránky stačí štítok a jednorazové
povolenie „iba čítať“ (gmail.readonly). Nič sa z Gmailu neposiela von
a neupravuje.

Čo od Vás budeme potrebovať (spoločne cez obrazovku / krátky call):
1) vytvoriť štítok Revolis a filter na portálové dopyty,
2) potvrdiť Google súhlas (iba čítanie tohto štítku),
3) 1–2 dni bežať starý aj nový spôsob paralelne — forward zatiaľ
   nevypíname.

Kampaň / testovací beh môžeme držať podľa dohodnutého mesiaca.
Termín 15–20 min, kedy Vám to vyhovuje?

Ďakujem,
[meno]
```

## GO brány

| Krok | Brána |
|------|-------|
| Vercel Preview secrets + curl smoke | GO REQUIRED (founder) |
| Email Smolkovi | GO REQUIRED (odoslanie) |
| Vypnúť Gmail forward | GO REQUIRED po 24–48 h dual-run dôkaze |
| Production env | GO REQUIRED |
