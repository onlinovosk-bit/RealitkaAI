/**
 * Onboard new agency tenant — dry-run by default.
 *
 * Reuses patterns from demo-bootstrap-profiles.cjs + demo-onboarding B/C/G.
 * Does NOT: auth invite, outbound email, Stripe, lead import.
 *
 * Usage:
 *   node apps/crm/scripts/onboard-agency.cjs \
 *     --name "Reality XYZ" \
 *     --owner-email "majitel@xyz.sk" \
 *     [--owner-name "Majiteľ RK"] \
 *     [--makleri "Novák:novak@xyz.sk,Kováč:kovac@xyz.sk"] \
 *     [--billing stripe|manual] \
 *     [--seat-tier solo|team|office] \
 *     [--manual-plan market_vision] \
 *     [--seats 3] \
 *     [--execute]
 *
 * Default (noví zákazníci): billing=stripe, seat-tier=team (3 seaty @ 71 €).
 * manual + market_vision = len grandfathered výnimky (Smolko) — nie pre nových.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { randomBytes } = require("crypto");

const ALLOWED_BILLING = new Set(["stripe", "manual"]);
const ALLOWED_SEAT_TIERS = new Set(["solo", "team", "office"]);

const ALLOWED_MANUAL_PLANS = new Set([
  "free",
  "starter",
  "pro",
  "scale",
  "market_vision",
  "protocol_authority",
]);

/** Mirrors apps/crm/src/lib/program-tier-pricing.ts SEAT_TIER_CONFIG */
const SEAT_TIER_CONFIG = {
  solo: { minSeats: 1, defaultSeats: 1, accountTier: "starter", planLabel: "solo" },
  team: { minSeats: 3, defaultSeats: 3, accountTier: "pro", planLabel: "team" },
  office: { minSeats: 10, defaultSeats: 10, accountTier: "enterprise", planLabel: "office" },
};

const MANUAL_PLAN_TO_UI_ROLE = {
  protocol_authority: "owner_protocol",
  market_vision: "owner_vision",
  scale: "owner_vision",
  enterprise: "owner_vision",
  pro: "owner_vision",
  starter: "owner_vision",
  free: "agent",
};

const MANUAL_PLAN_TO_ACCOUNT_TIER = {
  free: "free",
  starter: "starter",
  pro: "pro",
  scale: "market_vision",
  market_vision: "market_vision",
  protocol_authority: "protocol_authority",
};

function resolveBillingConfig({ billingMode, seatTier, manualPlan, seatsArg }) {
  if (billingMode === "manual") {
    const manualKey = manualPlan || "market_vision";
    if (!ALLOWED_MANUAL_PLANS.has(manualKey)) {
      throw new Error(`--manual-plan invalid for manual billing: ${manualKey}`);
    }
    const accountTier = MANUAL_PLAN_TO_ACCOUNT_TIER[manualKey] || "market_vision";
    const uiRole = MANUAL_PLAN_TO_UI_ROLE[manualKey] || "owner_vision";
    const seats = Number.isFinite(seatsArg) && seatsArg > 0 ? seatsArg : 5;
    return {
      billing_source: "manual_invoice",
      manual_plan: manualKey,
      account_tier: accountTier,
      owner_ui_role: uiRole,
      seats,
      plan: manualKey,
      seat_tier: null,
      pricing_note: "Grandfathered manual_invoice (Smolko vzor) — nie pre nových seat zákazníkov",
    };
  }

  const tier = SEAT_TIER_CONFIG[seatTier] || SEAT_TIER_CONFIG.team;
  const seats =
    Number.isFinite(seatsArg) && seatsArg > 0
      ? Math.max(seatsArg, tier.minSeats)
      : tier.defaultSeats;

  return {
    billing_source: "stripe",
    manual_plan: null,
    account_tier: tier.accountTier,
    owner_ui_role: "owner_vision",
    seats,
    plan: tier.planLabel,
    seat_tier: seatTier,
    pricing_note: `Seat billing (${seatTier}: ${seats} seatov, account_tier=${tier.accountTier})`,
  };
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function slugifyName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "agency";
}

function parseMakleri(raw) {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(":");
      if (colon === -1) {
        throw new Error(`Invalid --makleri entry "${part}" — use Name:email@domain.sk`);
      }
      const full_name = part.slice(0, colon).trim();
      const email = part.slice(colon + 1).trim().toLowerCase();
      if (!full_name || !email.includes("@")) {
        throw new Error(`Invalid --makleri entry "${part}" — use Name:email@domain.sk`);
      }
      return { full_name, email };
    });
}

function ownerNameFromEmail(email, explicit) {
  if (explicit && explicit.trim()) return explicit.trim();
  const local = email.split("@")[0] || "Owner";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

async function findAgencyDuplicate(supa, { name, slug }) {
  const { data: byName, error: nameError } = await supa
    .from("agencies")
    .select("id,name,slug")
    .ilike("name", name)
    .limit(1);
  if (nameError) throw nameError;
  if (byName?.length) return { field: "name", row: byName[0] };

  const { data: bySlug, error: slugError } = await supa
    .from("agencies")
    .select("id,name,slug")
    .eq("slug", slug)
    .limit(1);
  if (slugError) throw slugError;
  if (bySlug?.length) return { field: "slug", row: bySlug[0] };

  return null;
}

async function findProfileByEmail(supa, email) {
  const { data, error } = await supa
    .from("profiles")
    .select("id,email,agency_id,role,full_name")
    .ilike("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureUniqueSlug(supa, baseSlug, execute) {
  let candidate = baseSlug;
  for (let i = 0; i < 5; i += 1) {
    const { data, error } = await supa
      .from("agencies")
      .select("id")
      .eq("slug", candidate)
      .limit(1);
    if (error) throw error;
    if (!data?.length) return candidate;
    candidate = `${baseSlug}-${randomBytes(2).toString("hex")}`;
  }
  if (!execute) return `${baseSlug}-dry`;
  throw new Error(`Could not allocate unique slug for "${baseSlug}"`);
}

function buildMailboxAddress(slug) {
  return `${slug}-${randomBytes(2).toString("hex")}@revolis.ai`;
}

async function main() {
  const name = argValue("--name");
  const ownerEmail = (argValue("--owner-email") || "").trim().toLowerCase();
  const ownerName = argValue("--owner-name");
  const billingMode = (argValue("--billing") || "stripe").trim().toLowerCase();
  const seatTier = (argValue("--seat-tier") || "team").trim().toLowerCase();
  const manualPlanArg = argValue("--manual-plan");
  const seatsArg = argValue("--seats") ? Number(argValue("--seats")) : null;
  const execute = hasFlag("--execute");

  if (!name?.trim()) throw new Error("--name is required");
  if (!ownerEmail || !ownerEmail.includes("@")) throw new Error("--owner-email is required");
  if (!ALLOWED_BILLING.has(billingMode)) {
    throw new Error(`--billing must be one of: ${[...ALLOWED_BILLING].join(", ")}`);
  }
  if (billingMode === "stripe" && !ALLOWED_SEAT_TIERS.has(seatTier)) {
    throw new Error(`--seat-tier must be one of: ${[...ALLOWED_SEAT_TIERS].join(", ")}`);
  }

  const billing = resolveBillingConfig({
    billingMode,
    seatTier,
    manualPlan: manualPlanArg?.trim().toLowerCase(),
    seatsArg,
  });

  const makleri = parseMakleri(argValue("--makleri"));
  const baseSlug = slugifyName(name);
  const ownerFullName = ownerNameFromEmail(ownerEmail, ownerName);
  const ownerUiRole = billing.owner_ui_role;
  const ownerAccountTier = billing.account_tier;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env (.env.local)");

  const supa = createClient(url, key, { auth: { persistSession: false } });
  const actions = [];

  const duplicateAgency = await findAgencyDuplicate(supa, { name: name.trim(), slug: baseSlug });
  if (duplicateAgency) {
    actions.push({
      action: "ERROR",
      step: "agency",
      error: `Agency already exists (${duplicateAgency.field})`,
      existing: duplicateAgency.row,
    });
    printReport({ execute, name, ownerEmail, billing, actions, verify: null });
    process.exitCode = 1;
    return;
  }

  const existingOwnerProfile = await findProfileByEmail(supa, ownerEmail);
  if (existingOwnerProfile) {
    actions.push({
      action: "ERROR",
      step: "owner_profile",
      error: "Owner email already used by another profile",
      existing: existingOwnerProfile,
    });
    printReport({ execute, name, ownerEmail, billing, actions, verify: null });
    process.exitCode = 1;
    return;
  }

  const slug = await ensureUniqueSlug(supa, baseSlug, execute);
  const mailboxAddress = buildMailboxAddress(slug);

  let agencyId = null;

  if (!execute) {
    actions.push({
      action: "WOULD_INSERT",
      step: "agency",
      name: name.trim(),
      slug,
      billing_source: billing.billing_source,
      manual_plan: billing.manual_plan,
      account_tier: billing.account_tier,
      seats: billing.seats,
      seat_tier: billing.seat_tier,
      plan: billing.plan,
      email: ownerEmail,
      is_active: true,
    });
    actions.push({
      action: "WOULD_INSERT",
      step: "owner_profile",
      full_name: ownerFullName,
      email: ownerEmail,
      role: "owner",
      ui_role: ownerUiRole,
      account_tier: ownerAccountTier,
      auth_user_id: null,
    });
    for (const agent of makleri) {
      actions.push({
        action: "WOULD_INSERT",
        step: "agent_profile",
        ...agent,
        role: "agent",
      });
    }
    actions.push({
      action: "WOULD_INSERT",
      step: "inbound_mailbox",
      email: mailboxAddress,
      active: true,
    });
  } else {
    const agencyInsert = {
      name: name.trim(),
      slug,
      plan: billing.plan,
      seats: billing.seats,
      account_tier: billing.account_tier,
      billing_source: billing.billing_source,
      email: ownerEmail,
      is_active: true,
    };
    if (billing.manual_plan) agencyInsert.manual_plan = billing.manual_plan;

    const { data: agency, error: agencyError } = await supa
      .from("agencies")
      .insert(agencyInsert)
      .select("id,name,slug,manual_plan,billing_source,seats,account_tier,plan")
      .single();

    if (agencyError) {
      actions.push({ action: "ERROR", step: "agency", error: agencyError.message });
      printReport({ execute, name, ownerEmail, billing, actions, verify: null });
      process.exitCode = 1;
      return;
    }

    agencyId = agency.id;
    actions.push({ action: "INSERTED", step: "agency", ...agency });

    const ownerPayload = {
      agency_id: agencyId,
      team_id: null,
      full_name: ownerFullName,
      email: ownerEmail,
      role: "owner",
      phone: "",
      is_active: true,
      auth_user_id: null,
      ui_role: ownerUiRole,
      account_tier: ownerAccountTier,
    };

    const { data: ownerProfile, error: ownerError } = await supa
      .from("profiles")
      .insert(ownerPayload)
      .select("id,agency_id,full_name,email,role,ui_role,account_tier")
      .single();

    if (ownerError) {
      actions.push({ action: "ERROR", step: "owner_profile", error: ownerError.message });
      printReport({ execute, name, ownerEmail, billing, actions, verify: null, agencyId });
      process.exitCode = 1;
      return;
    }
    actions.push({ action: "INSERTED", step: "owner_profile", ...ownerProfile });

    const { data: existingAgents } = await supa
      .from("profiles")
      .select("id,email,full_name")
      .eq("agency_id", agencyId);
    const agentsByEmail = new Map(
      (existingAgents || []).map((row) => [String(row.email || "").toLowerCase(), row]),
    );

    for (const agent of makleri) {
      const existing = agentsByEmail.get(agent.email);
      if (existing) {
        actions.push({
          action: "SKIP_EXISTS",
          step: "agent_profile",
          id: existing.id,
          ...agent,
        });
        continue;
      }

      const globalExisting = await findProfileByEmail(supa, agent.email);
      if (globalExisting) {
        actions.push({
          action: "ERROR",
          step: "agent_profile",
          error: "Email already used by profile in another agency",
          ...agent,
          existing: globalExisting,
        });
        continue;
      }

      const { data: inserted, error: agentError } = await supa
        .from("profiles")
        .insert({
          agency_id: agencyId,
          team_id: null,
          full_name: agent.full_name,
          email: agent.email,
          role: "agent",
          phone: "",
          is_active: true,
        })
        .select("id,agency_id,full_name,email,role")
        .single();

      if (agentError) {
        actions.push({ action: "ERROR", step: "agent_profile", error: agentError.message, ...agent });
        continue;
      }
      actions.push({ action: "INSERTED", step: "agent_profile", ...inserted });
      agentsByEmail.set(agent.email, inserted);
    }

    const { data: existingMailbox } = await supa
      .from("inbound_mailboxes")
      .select("id,email,active")
      .eq("agency_id", agencyId)
      .eq("active", true)
      .limit(1);

    if (existingMailbox?.length) {
      actions.push({
        action: "SKIP_EXISTS",
        step: "inbound_mailbox",
        ...existingMailbox[0],
      });
    } else {
      const { data: mailbox, error: mailboxError } = await supa
        .from("inbound_mailboxes")
        .insert({
          agency_id: agencyId,
          email: mailboxAddress,
          active: true,
        })
        .select("id,agency_id,email,active,created_at")
        .single();

      if (mailboxError) {
        actions.push({ action: "ERROR", step: "inbound_mailbox", error: mailboxError.message });
      } else {
        actions.push({ action: "INSERTED", step: "inbound_mailbox", ...mailbox });
      }
    }
  }

  const verifyAgencyId = agencyId;
  let verify = null;
  if (verifyAgencyId) {
    const { count: profileCount } = await supa
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", verifyAgencyId);
    const { count: mailboxCount } = await supa
      .from("inbound_mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", verifyAgencyId)
      .eq("active", true);

    verify = {
      agency_id: verifyAgencyId,
      profiles: profileCount ?? 0,
      active_mailboxes: mailboxCount ?? 0,
    };
  }

  printReport({
    execute,
    name: name.trim(),
    ownerEmail,
    billing,
    actions,
    verify,
    agencyId: verifyAgencyId,
    mailboxAddress: execute
      ? actions.find((a) => a.step === "inbound_mailbox" && (a.action === "INSERTED" || a.action === "SKIP_EXISTS"))
          ?.email || mailboxAddress
      : mailboxAddress,
  });
}

function printReport({
  execute,
  name,
  ownerEmail,
  billing,
  actions,
  verify,
  agencyId,
  mailboxAddress,
}) {
  const manualSteps =
    billing.billing_source === "stripe"
      ? [
          "Stripe: Customer + Seat subscription (send_invoice) — qty = seats z reportu",
          "Po platbe: webhook doplní stripe_customer_id / subscription_status (alebo ručne)",
          "Supabase Auth invite pre ownera (až po konsente zákazníka)",
          "Import leadov (/import/universal alebo Realvia) — dáta dodá zákazník",
          "Smoke: prepošli test mail na inbound alias",
        ]
      : [
          "Stripe faktúra (manual_invoice — len grandfathered klienti ako Smolko)",
          "Supabase Auth invite pre ownera (až po konsente zákazníka)",
          "Import leadov (/import/universal alebo Realvia) — dáta dodá zákazník",
          "Smoke: prepošli test mail na inbound alias",
        ];

  const report = {
    phase: "onboard_agency",
    mode: execute ? "execute" : "dry_run",
    agency_name: name,
    owner_email: ownerEmail,
    billing_source: billing.billing_source,
    manual_plan: billing.manual_plan,
    seat_tier: billing.seat_tier,
    seats: billing.seats,
    account_tier: billing.account_tier,
    pricing_note: billing.pricing_note,
    agency_id: agencyId ?? null,
    inbound_alias: mailboxAddress ?? null,
    verify,
    manual_steps: manualSteps,
    actions,
  };

  console.log(JSON.stringify(report, null, 2));

  const alias = mailboxAddress || "(dry-run preview)";
  console.log("");
  console.log("=== HUMAN SUMMARY ===");
  console.log(`Agentúra "${name}" ${execute ? "pripravená" : "— DRY RUN (žiadny zápis)"}.`);
  console.log(`Billing: ${billing.pricing_note}`);
  console.log(`Inbound alias: ${alias}`);
  if (agencyId) console.log(`Agency ID: ${agencyId}`);
  console.log("Ručné kroky:");
  for (const step of manualSteps) {
    console.log(`  - ${step}`);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ phase: "fatal", error: String(error) }, null, 2));
  process.exitCode = 1;
});
