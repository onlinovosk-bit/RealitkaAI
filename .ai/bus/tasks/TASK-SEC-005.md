---
id: TASK-SEC-005
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #462 https://github.com/onlinovosk-bit/RealitkaAI/pull/462 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #462 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/app/api/settings/auth-email-tests/**
    - .ai/bus/tasks/TASK-SEC-005.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "recovery-link blok nemá agency_id check pred generateLink"
    cmd: "python -c \"from pathlib import Path; import re,sys; t=Path(r'apps/crm/src/app/api/settings/auth-email-tests/route.ts').read_text(encoding='utf-8'); m=re.search(r'if \\(action === \\\"recovery-link\\\"\\) \\{([\\s\\S]*?)\\n    \\}', t); b=m.group(1) if m else ''; sys.exit(0 if ('generateLink' in b and 'agency_id' not in b) else 1)\""
    expect: exit_code == 0
  - id: A2
    desc: "invite profiles upsert nestampuje agency_id"
    cmd: "python -c \"from pathlib import Path; import re,sys; t=Path(r'apps/crm/src/app/api/settings/auth-email-tests/route.ts').read_text(encoding='utf-8'); m=re.search(r'\\.upsert\\(\\s*\\{([\\s\\S]*?)\\}\\s*,', t); u=m.group(1) if m else ''; sys.exit(0 if 'agency_id' not in u else 1)\""
    expect: exit_code == 0
risk: critical
evidence:
  commands:
    - "rg -n \"recovery-link|generateLink|agency_id|upsert\" apps/crm/src/app/api/settings/auth-email-tests/route.ts  # exit=0; agency_id only in profile select list, not in recovery-link block"
    - "python A462-1  # exit=0 hole=True (generateLink without agency_id in block)"
    - "python A462-2  # exit=0 invite_missing_agency=True"
  files:
    - apps/crm/src/app/api/settings/auth-email-tests/route.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/462
next_action:
  gate: GO REQUIRED
  description: "Po founder GO: viazať recovery target na caller agency_id; stamp agency_id na invite upsert; nevracať action_link cross-tenant."
---

# TASK-SEC-005 — auth-email-tests recovery mimo agentúry

## Summary

`POST /api/settings/auth-email-tests` (`recovery` / `recovery-link`) pustí ownera
generovať recovery pre **ľubovoľný email** bez kontroly
`target.agency_id === caller.agency_id`. `recovery-link` vracia Supabase Admin
`action_link` → cross-tenant account takeover. Invite upsert nestampuje
`agency_id`. Nález z PR #462 **stále platí**.

## Context

- Gate kontroluje len `canManageUsers` (role), nie tenant match.
- Sibling open #447 na `/api/invite` spomínaný v PR — mimo scope tejto karty.
- #569/#572/#575 sa route nedotkli.

## Evidence

```text
# recovery-link block contains generateLink(... email: requestedEmail) and no agency_id
python check → exit=0 hole=True

# invite upsert fields: id, full_name, email, role, is_active — no agency_id
python check → exit=0
```

## Next action

Founder GO → agency-scope target + stamp agency_id (podľa #462).
