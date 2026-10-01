# W-WAVE — Lead capture (W-LEADS)
Repo: `C:\RealitkaAI` · Wave po Brief 11 Revival · sekvenčný GO po P0 CEO

```yaml
task: lead-capture
reads:   [leads, profiles, auth]
writes:  [leads]
migrations: false
requires: [auth, agency_id]
conflicts: []
depends_on: [brief-11-revival-closed]
risk: medium
```

## Scope (Wave 3 roadmap #1 — TERAZ)
Ručný záznam makléra: `/leads/new` + inline `LeadCreateForm` → `POST /api/leads`.

**Nestavať v tomto wave:** CSV Dopyty import, Meta Lead Ads, attribution engine, dedup ML.

## Deliverables
- `[verification]` kontrakt `POST /api/leads` (auth, agency scoping, min polia).
- UX: link na plný formulár `/leads/new` z `/leads`; a11y `label`↔`input` na quick capture.
- Smoke: maklér vytvorí lead → redirect na detail → lead v inventári.

## HARD pravidlá
- 1 PR = W-LEADS. Žiadny merge bez zeleného CI.
- Žiadna nová tabuľka (migrations: false).
- GDPR: first-party CRM záznam pri obchodnom kontakte (6(1)(b)/(f) — pozri wave3 roadmap).

## Acceptance
- Vitest verification green.
- `npm run build` green.
- PROD smoke (manuál): Smolko → `/leads/new` → uložiť test lead → viditeľný v zozname.
