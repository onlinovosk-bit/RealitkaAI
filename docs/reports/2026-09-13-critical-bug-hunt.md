# Critical bug hunt — Revolis CRM (2026-09-13)

Report-only. No runtime fixes in this commit.
Branch: `cursor/critical-bug-management-ecf5`
Scope: `apps/crm` high-blast-radius paths since ~2026-08-20; patterns from hunt brief.

## Already tracked (not re-reported)

#369, #370, #443, #444, #447, #462, #486, #490, #495, #537, #545

## NEW bugs (concrete trigger + impact)

### 1. Demo request: silent SaaS-lead / CRM-task drop (HIGH)

**Files**
- `apps/crm/src/app/api/demo/request/route.ts`
- `apps/crm/src/lib/sales-funnel-store.ts` (`createSaasLead`)
- `apps/crm/src/lib/demo-booking-store.ts` (`createDemoBookingTask`)

**Root cause**
1. Public `POST /api/demo/request` calls `createSaasLead(...)` **without** a service-role client (contrast: `/api/proof` correctly passes `createServiceRoleClient()`).
2. On **any** insert error, `createSaasLead` logs and returns a **fabricated** lead (`crypto.randomUUID()`), never throwing.
3. `createDemoBookingTask` uses cookie-less `getSupabaseClient()` (browser/anon singleton) to insert into `tasks` — same class as #545; RLS/`tasks_agency` rejects; function returns `{ ok: false }` but parent still returns `{ ok: true }`.
4. Confirmation email via Resend can still send, so the prospect and API both look successful.

**Trigger**
Anonymous visitor submits demo form → `POST /api/demo/request` with name/email/company (public path in `proxy.ts`).

**Impact**
Paying-prospect demo lead never lands in durable CRM (`saas_leads` / follow-up task) while UI/email ACK success → lost sales pipeline entries. Amplifies whenever anon/RLS/schema insert fails; task path fails even when `saas_leads` insert happens to succeed under open policies.

**Confidence:** high

---

### 2. Outreach cron + send API: unscoped `listLeads()` (HIGH)

**Files**
- `apps/crm/src/app/api/scheduled-outreach/route.ts`
- `apps/crm/src/lib/outreach-store.ts` (`sendAiOutreachEmail`)
- `apps/crm/src/app/api/outreach/send/route.ts` (caller)

**Root cause**
Server routes call `listLeads()` with **no** scoped/session client. `listLeads` → `resolveTenantSupabase()` → browser singleton → `resolveSessionAgencyId` finds no user → **empty array**.

- Cron: loops 0 leads, returns `{ ok: true }` (silent no-op).
- Manual send: `leads.find(id)` fails → `"Lead nebol nájdený"` even for valid tenant leads. Message inserts later use service-role, but lead lookup never reaches them.

**Trigger**
- Vercel cron `POST /api/scheduled-outreach` with valid `Bearer $CRON_SECRET`.
- Authenticated agent `POST /api/outreach/send` with a real `leadId`.

**Impact**
Scheduled AI outreach never runs (false green cron). Manual outreach permanently broken for real leads → missed contact windows / revenue leak on a billed feature surface.

**Confidence:** high

---

### 3. Playbook confirm-viewing: unscoped `getLead` + live send (HIGH)

**File:** `apps/crm/src/app/api/playbook/confirm-viewing/route.ts`  
**Amplifier:** `apps/crm/src/lib/leads-store.ts` `getLead` (on DB error falls back to `mockLeads`)

**Root cause**
Authenticated route calls `getLead(leadId)` without the request’s `createClient()` scope. On server, cookie-less browser client fails the select; `getLead` then returns mock-by-id or `undefined`. Contact resolves to `mockBusyDay` demo email/phone (`lucia.demo@revolis.ai` / `+421901112233`) and route may **Resend/Twilio** send.

No `agency_id` gate on the lead before send.

**Trigger**
Logged-in broker confirms a viewing from playbook UI (`POST /api/playbook/confirm-viewing` with `leadId` + `playbookItemId` like `viewing-today-1`).

**Impact**
Wrong recipient (demo contact) or failed notify of real buyer; possible accidental SMS/email to fixture numbers; real client never gets confirmation.

**Confidence:** high

---

### 4. Profiles PATCH: `updateProfile` without scoped server client (HIGH)

**Files**
- `apps/crm/src/app/api/profiles/[id]/route.ts` (non-role patch path)
- `apps/crm/src/lib/team-store.ts` (`updateProfile` → `resolveTenantSupabase()`)

**Root cause**
Same class as properties #443: API authenticates with `createClient()`, then mutates via store that falls back to browser singleton (no cookies on server). RLS/`profiles_self_update` rejects or no-ops; user sees error or stale profile. Owner role/active path uses admin correctly; **self name/email/phone/team** path does not pass `supabase`.

**Trigger**
Authenticated user `PATCH /api/profiles/{id}` changing `fullName` / `email` / `phone` / `teamId` (not role/isActive).

**Impact**
Profile edits silently fail or 500 while role flips via admin still work → broken team admin UX / wrong contact data persisted.

**Confidence:** high (same mechanism as #443; different surface)

---

## Near-misses (not filed as NEW high)

| Item | Why not NEW high |
|------|------------------|
| `matching-hooks.ts` `autoRecalculate*` without scoped | Same wipe class as **#444** (hooks call store without scoped; lead/property routes already create scoped client then drop it) |
| `properties` create/update/delete without scoped | **#443** |
| HubSpot sync / AI analyze fail-open null `agency_id` | **#486** |
| `team/teams` + `team/users` `callerProfile?.agency_id ?? body.agencyId` | App fail-open; `teams_agency` RLS `WITH CHECK (agency_id IN profile_agencies_for_auth())` blocks cross-tenant when migration applied — defense-in-depth hole, medium |
| `ghostwriter/send-email` any authed user → arbitrary Resend recipient | Abuse/spam surface; not tenant data-loss; medium–high ops risk |
| `ceo-command/[id]/read` fail-open when owner `agency_id` null | Admin mark-read cross-tenant only if null-agency owner exists (#447 class); medium |
| Cron `Bearer undefined` | Most cron routes now fail-closed (`!cronSecret`); residual covered by prior hunt / #503 |
| `demo/capture-lead` optional API key | Intentionally public marketing capture (in `PUBLIC_PATHS`); not silent CRM drop |

## Kontrolór

- Fakty podložené súborovými path + call-site diff vs `/api/proof` (service-role) and #545 pattern.
- Nie sú merge/fix artefakty — hunt only.
- Tracked list skipped.

## ĎALŠIA ÚLOHA (task-loop)

**ĎALŠIA ÚLOHA:** Fix `POST /api/demo/request` — pass service-role into `createSaasLead` + `createDemoBookingTask`; make `createSaasLead` throw on insert error (no fake UUID).  
**PREČO TERAZ:** Direct lost paying-prospect leads on public funnel; same severity class as #545/#495.  
**BRÁNA:** GO REQUIRED (1 PR = 1 fix; verification test for no-fallback-on-error).
