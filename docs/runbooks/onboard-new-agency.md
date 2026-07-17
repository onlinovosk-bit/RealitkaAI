# Onboard new agency — runbook

> Kanonická cesta pre 2.+ platiaceho klienta.  
> Skript: `apps/crm/scripts/onboard-agency.cjs` · Brief: `docs/briefs/BO-onboard-agency.md`

## Predpoklady (blokátory)

| ID | Čo | Overenie | Fix |
|----|-----|----------|-----|
| B1 | Auth mailing funguje | invite + recovery na test účte | `docs/runbooks/supabase-auth-email-templates-sk.md` |
| B2 | Kreditový model v schéme | `grant_credits_balance` existuje | `docs/audit/prod-migration-drift-2026-07-08.md` (✅ aplikované 2026-07-09) |
| B3 | RLS na onboarding tabuľkách | `client_onboarding_*` rls enabled | tamtiež (✅ aplikované 2026-07-09) |

Bez B1 nejde dokončiť login ownera. Postup: runbook vyššie → Nastavenia → Auth e-mail testy.

---

## Poradie (48 h sľub)

| # | Kto | Čo |
|---|-----|-----|
| 1 | Andy | Stripe — vystav faktúru / potvrď platbu |
| 2 | Andy | **Skript** — tenant shell (agentúra + profily + alias) |
| 3 | Andy + zákazník | Supabase invite ownera (až po konsente) |
| 4 | Zákazník | Import leadov (CSV / Realvia) |
| 5 | Zákazník | Nastav preposielanie dopytov na inbound alias |
| 6 | Andy | Smoke: test mail → lead v CRM |

---

## 1) Skript (kroky B + C + G)

Vyžaduje `apps/crm/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

### Dry-run (default)

```bash
cd apps/crm
node scripts/onboard-agency.cjs \
  --name "Reality XYZ" \
  --owner-email "majitel@xyz.sk" \
  --owner-name "Majiteľ XYZ" \
  --makleri "Novák:novak@xyz.sk,Kováč:kovac@xyz.sk"
```

### Execute (po GO, nie na Smolko / Demo)

```bash
node scripts/onboard-agency.cjs \
  --name "Reality XYZ" \
  --owner-email "majitel@xyz.sk" \
  --seat-tier team \
  --seats 5 \
  --execute
```

| Billing | Kedy | Príklad |
|---------|------|---------|
| `stripe` (default) | Noví platiaci zákazníci — seat/mes | `--seat-tier team --seats 5` |
| `manual` | Len grandfathered (Smolko) | `--billing manual --manual-plan market_vision` |

**Skript robí:** `agencies` INSERT · owner + agent `profiles` (`auth_user_id` NULL) · `inbound_mailboxes` alias.

**Skript nerobí:** auth invite · outbound email · Stripe API · import leadov.

---

## 2) Ručné kroky po skripte

### Stripe (noví zákazníci)

1. V Stripe vytvor Customer + **Seat subscription** (`send_invoice`)
2. Quantity = `seats` z výstupu skriptu (tier: solo/team/office)
3. Po platbe webhook doplní `stripe_customer_id` — alebo ručne

### Stripe (len Smolko / manual)

`manual_invoice` + `manual_plan=market_vision` — **nedávať novým zákazníkom**.

### Supabase invite (owner)

1. Authentication → Invite → `--owner-email`
2. Po prihlásení over `profiles.auth_user_id` (auto-link alebo SQL UPDATE)

### Import leadov

- `/import/universal` pod owner session, alebo
- Realvia webhook — nastav `realvia_identifikator` na `agencies` ak treba per-tenant routing

---

## 3) E-mail zákazníkovi (šablóna)

```
Predmet: Revolis — váš inbound kanál pre dopyty

Dobrý deň,

váš Revolis tenant je pripravený.

Preposielajte dopyty z portálov na túto adresu:
  <INBOUND_ALIAS z výstupu skriptu>

Príklad: automatické preposlanie z Nehnuteľnosti.sk / email klienta.
Do 1–2 minút uvidíte lead v dashboarde s AI prioritou.

Prihlásenie: pozvánku dostanete v samostatnom e-maile (po vašom súhlase).

S pozdravom,
Andy · Revolis
```

---

## 4) Verify

```bash
npm run ops:tenant-health -- --agency-id <UUID z JSON reportu>
```

Alebo SQL:

```sql
select id, name, slug, manual_plan, billing_source, seats, account_tier
from agencies where id = '<agency_uuid>';

select count(*) from profiles where agency_id = '<agency_uuid>';

select email, active, last_received_at
from inbound_mailboxes where agency_id = '<agency_uuid>';
```

---

## 5) Test tenant cleanup

Po acceptance teste na fiktívnej agentúre:

```sql
-- len TEST UUID, nikdy Smolko/Demo
delete from inbound_mailboxes where agency_id = '<test_uuid>';
delete from profiles where agency_id = '<test_uuid>';
delete from agencies where id = '<test_uuid>';
```

---

## Súvisiace

| Súbor | Účel |
|-------|------|
| `docs/runbooks/demo-onboarding-b-g-draft.md` | Overené B–G kroky (demo tenant) |
| `apps/crm/docs/SMOLKO-OPS-RUNBOOK.md` | Referenčný klient — `manual_plan` |
| `docs/runbooks/supabase-auth-email-templates-sk.md` | B1 auth šablóny + SMTP |
| `apps/crm/scripts/prod-smoke.md` | Post-deploy smoke |
