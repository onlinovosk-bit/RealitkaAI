/**
 * Safe operational snapshot for Realvia webhook debugging (no secret values leaked).
 */

function nonEmpty(raw: string | undefined): boolean {
  return Boolean(raw?.trim());
}

/** Count IPs from REALVIA_ALLOWED_IP comma list (matches validate.ts defaults). */
export function countAllowedRealviaIPs(): number {
  const envIPs = process.env.REALVIA_ALLOWED_IP ?? '185.59.208.101';
  return envIPs
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean).length;
}

export type RealviaInboundConfigSnapshot = {
  nodeEnv: string;
  checks: {
    realviaIdentifier1: boolean;
    realviaIdentifier2: boolean;
    sharedSecretConfigured: boolean;
    allowedIpEntryCount: number;
    supabaseUrlConfigured: boolean;
    serviceRoleKeyConfigured: boolean;
    cronSecretConfigured: boolean;
    realviaDefaultAgencyIdConfigured: boolean;
  };
  hints: string[];
};

/**
 * Operator-facing checklist. Does not include actual keys or header values.
 */
export function buildRealviaInboundConfigSnapshot(): RealviaInboundConfigSnapshot {
  const hints: string[] = [];

  const id1 = nonEmpty(process.env.REALVIA_IDENTIFIER);
  const id2 = nonEmpty(process.env.REALVIA_IDENTIFIER_2);
  const shared = nonEmpty(process.env.REALVIA_SHARED_SECRET);
  const supabaseUrl = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRole = nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cronSecret = nonEmpty(process.env.CRON_SECRET);
  const defaultAgency = nonEmpty(process.env.REALVIA_DEFAULT_AGENCY_ID);

  if (process.env.NODE_ENV === 'production' && (!id1 || !id2)) {
    hints.push(
      'Production requires REALVIA_IDENTIFIER and REALVIA_IDENTIFIER_2 — otherwise validateSecret fails for identifikator mode.',
    );
    if (shared) {
      hints.push(
        'REALVIA_SHARED_SECRET is set but identifier pair is incomplete — Realvia push uses identifikator/identifikator2, not X-Revolis-Secret; fix env or you will get Invalid authentication.',
      );
    }
  }
  if (!supabaseUrl || !serviceRole) {
    hints.push(
      'Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing — webhook returns 500 on storeWebhookLog.',
    );
  }
  if (!cronSecret) {
    hints.push(
      'CRON_SECRET missing — /api/cron/realvia-process and this diag endpoint cannot be authorized.',
    );
  }
  if (countAllowedRealviaIPs() === 0) {
    hints.push('REALVIA_ALLOWED_IP parses to zero IPs — all non-dev requests may fail IP check.');
  }
  if (defaultAgency) {
    hints.push(
      'REALVIA_DEFAULT_AGENCY_ID is set — unresolved agency pairs fall back here (audit agency mapping separately).',
    );
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    checks: {
      realviaIdentifier1: id1,
      realviaIdentifier2: id2,
      sharedSecretConfigured: shared,
      allowedIpEntryCount: countAllowedRealviaIPs(),
      supabaseUrlConfigured: supabaseUrl,
      serviceRoleKeyConfigured: serviceRole,
      cronSecretConfigured: cronSecret,
      realviaDefaultAgencyIdConfigured: defaultAgency,
    },
    hints,
  };
}
