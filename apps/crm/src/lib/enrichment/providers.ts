import { normalizePhone } from "@/lib/import/contacts-import-core";

import type { EnrichmentProvider } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ICO_RE = /^\d{8}$/;
const RPO_CACHE_TTL_MS = 10 * 60 * 1000;
const RPO_MIN_INTERVAL_MS = 150;

type RpoOrganization = {
  id?: number;
  data?: {
    id?: number;
    fullNames?: Array<{ value?: string }>;
    identifiers?: Array<{ value?: string }>;
    legalForms?: Array<{ value?: { value?: string; code?: string } }>;
    addresses?: Array<{
      street?: string;
      regNumber?: number | string;
      buildingNumber?: string;
      postalCodes?: string[];
      municipality?: { value?: string };
      country?: { value?: string };
    }>;
  };
};

const rpoCache = new Map<string, { expiresAt: number; value: unknown }>();
let lastRpoRequestAt = 0;

function nowMs() {
  return Date.now();
}

async function waitForRateLimit() {
  const waitMs = Math.max(0, RPO_MIN_INTERVAL_MS - (nowMs() - lastRpoRequestAt));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRpoRequestAt = nowMs();
}

function getRpoEndpoint(ico: string) {
  const base = process.env.RPO_V2_BASE_URL?.trim()
    || "https://datahub.ekosystem.slovensko.digital/api/data/rpo2/organizations";
  return `${base.replace(/\/+$/, "")}/${encodeURIComponent(ico)}`;
}

function parseRpoOrganization(payload: unknown, endpoint: string) {
  const body = payload as RpoOrganization;
  const firstName = body.data?.fullNames?.[0]?.value ?? null;
  const firstIdentifier = body.data?.identifiers?.[0]?.value ?? null;
  const legalForm = body.data?.legalForms?.[0]?.value?.value ?? null;
  const address = body.data?.addresses?.[0];
  const addressLabel = address
    ? [
        address.street,
        address.regNumber != null ? String(address.regNumber) : null,
        address.buildingNumber ?? null,
        address.postalCodes?.[0] ?? null,
        address.municipality?.value ?? null,
        address.country?.value ?? null,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    source: "rpo-v2",
    source_url: endpoint,
    license: "CC BY 4.0",
    organization_id: body.id ?? body.data?.id ?? null,
    ico: firstIdentifier,
    company_name: firstName,
    legal_form: legalForm,
    address: addressLabel,
  };
}

function normalizedIco(record: Record<string, unknown>): string | null {
  const ico = String(record.ico ?? "").trim();
  if (!ICO_RE.test(ico)) return null;
  return ico;
}

export const phoneValidationProvider: EnrichmentProvider = {
  name: "phone-normalization",
  canHandle(field) {
    return field === "phone" || field === "phone_quality";
  },
  async fetch(ctx) {
    const raw = ctx.record.data.phone;
    const { phone, status } = normalizePhone(raw);
    if (ctx.field === "phone_quality") {
      return {
        source: "phone-normalization",
        value: {
          valid: Boolean(phone),
          normalized: phone || null,
          status,
          reason: phone ? null : "missing_or_invalid_phone",
        },
      };
    }
    if (!phone) return null;
    return {
      source: "phone-normalization",
      value: phone,
    };
  },
};

export const emailValidationProvider: EnrichmentProvider = {
  name: "email-validation",
  canHandle(field) {
    return field === "email" || field === "email_quality";
  },
  async fetch(ctx) {
    const email = String(ctx.record.data.email ?? "").trim().toLowerCase();
    const valid = Boolean(email && EMAIL_RE.test(email));
    if (ctx.field === "email_quality") {
      return {
        source: "email-validation",
        value: {
          valid,
          normalized: valid ? email : null,
          reason: valid ? null : "missing_or_invalid_email",
        },
      };
    }
    if (!valid) return null;
    return {
      source: "email-validation",
      value: email,
    };
  },
};

export const katasterLookupProvider: EnrichmentProvider = {
  name: "kataster-stub",
  canHandle(field) {
    return field === "owner_name" || field === "parcel_id" || field === "location";
  },
  async fetch(ctx) {
    if (!ctx.record.data.address && !ctx.record.data.parcel_id && !ctx.record.data.location) return null;
    return {
      source: "kataster-stub",
      value: {
        confidence: "stub",
        status: "todo-real-api",
        note: "Kataster lookup provider is stubbed in PoC.",
      },
    };
  },
};

export const finstatOrsrProvider: EnrichmentProvider = {
  name: "rpo-v2",
  canHandle(field) {
    return field === "company_profile";
  },
  async fetch(ctx) {
    const ico = normalizedIco(ctx.record.data);
    if (!ico) return null;
    const cacheKey = `rpo2:${ico}`;
    const cached = rpoCache.get(cacheKey);
    if (cached && cached.expiresAt > nowMs()) {
      return {
        source: "rpo-v2-cache",
        value: cached.value,
      };
    }

    await waitForRateLimit();
    const endpoint = getRpoEndpoint(ico);
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const value = parseRpoOrganization(payload, endpoint);
    rpoCache.set(cacheKey, {
      expiresAt: nowMs() + RPO_CACHE_TTL_MS,
      value,
    });

    return {
      source: "rpo-v2",
      value,
    };
  },
};

export const defaultEnrichmentProviders: EnrichmentProvider[] = [
  phoneValidationProvider,
  emailValidationProvider,
  katasterLookupProvider,
  finstatOrsrProvider,
];
