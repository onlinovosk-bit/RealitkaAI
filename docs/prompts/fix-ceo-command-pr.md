# PR — fix/ceo-command-load (moja časť: allowlist + fallback)
Repo: `C:\RealitkaAI` · cieľový path: `docs/prompts/fix-ceo-command-pr.md`

```yaml
task: ceo-fix
reads:   [routine_notifications, leads, profiles, auth]
writes:  [public-schema-allowlist.json]   # kód; samotná migrácia = TVOJ prod apply
migrations: false                          # tento PR migráciu NEaplikuje
requires: [auth]
risk:    production
```

## HARD pravidlá
- Vetva → commit → push → PR → CI zelená → STOP. **Žiadny prod apply v tomto PR** — migráciu aplikuješ ty (GO).
- AP-012: minimálny diff, žiadny ride-along.

## ČASŤ 1 — Schema allowlist
Pridaj do `public-schema-allowlist.json` (over presnú štruktúru a názov tabuľky, čo migrácia reálne vytvára):
```json
"routine_notifications"
```
`enrichment_log` pridaj **len ak** ho reálne vytvára enrichment migrácia Briefu 11. Inak ho nepridávaj — allowlist by tváril, že existuje tabuľka, ktorá na repe ešte nie je, a zatieni budúci legitímny drift.

**Meta-pravidlo do `memory/decisions.md` (AP-019):** každá nová tabuľka → v tom istom PR do allowlistu. Inak Schema Guard mlčí o drifte (presne tento bug).

## ČASŤ 2 — Graceful fallback (scoped, NEmaskujúci)
Cieľ: `/ceo-command` nikdy nespadne na 500 kvôli prázdnym/chýbajúcim notifikáciám. Owner musí vidieť summary aj keď notifikácie nie sú.

**Route (`app/api/ceo-command*/route.ts`):**
- Obal **iba fetch notifikácií** do try/catch. Pri chybe/prázdne → `notifications: []`, summary sa ráta ďalej.
- **NEmaskuj** auth ani summary chybu — tie nech bublajú (to nie je „prázdny stav", to je reálny error). Toto je rozdiel medzi graceful degradation a maskovaním (AP-013 logika).
- Vždy **zaloguj** podkladovú príčinu (`console.error`/logger), nech drift ostane viditeľný aj keď UI prežije.
```ts
let notifications = [];
try {
  notifications = await loadCeoNotifications(agencyId);
} catch (e) {
  logger.error("ceo_command notifications load failed", { agencyId, e });
  notifications = []; // degrade, neskrývaj — summary ide ďalej
}
return Response.json({ summary, notifications }); // 200
```

**Store (client):** fetch notifikácií, ktorý zlyhá, → prázdny stav („Žiadne príkazy"), nie červený error banner. Banner nechaj len pre auth/summary zlyhanie.

## ACCEPTANCE
- Pred migráciou (lokálne, bez tabuľky): route vráti 200 + `notifications:[]`, summary funguje, žiadny červený box.
- Po migrácii: 200 plné, summary z leadov, `notifications:[]` kým nebeží routine.
- Test: route s mock zlyhaním notifikácií → 200 + []; route s auth zlyhaním → stále error (nemaskované).

## TVOJA ČASŤ PO MERGE (GO)
1. Apply migrácie `20260609210000_routine_notifications.sql` na PROD (over: čisto aditívna, žiadne DROP/UPDATE).
2. Post-fix smoke ako Smolko: `/ceo-command` → 200 plné, summary 439, `notifications:[]`.
3. Potvrď, že Schema Guard už tabuľku nehlási ako drift.
