import { normalizePhone } from "@/lib/import/contacts-import-core";

import type { EnrichmentProvider } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const phoneValidationProvider: EnrichmentProvider = {
  name: "phone-normalization",
  canHandle(field) {
    return field === "phone";
  },
  async fetch(ctx) {
    const raw = ctx.record.data.phone;
    const { phone, status } = normalizePhone(raw);
    if (!phone) return null;
    return {
      source: "phone-normalization",
      value: {
        normalized: phone,
        status,
      },
    };
  },
};

export const emailValidationProvider: EnrichmentProvider = {
  name: "email-validation",
  canHandle(field) {
    return field === "email";
  },
  async fetch(ctx) {
    const email = String(ctx.record.data.email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return null;
    return {
      source: "email-validation",
      value: {
        normalized: email,
        valid: true,
      },
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
  name: "finstat-orsr-stub",
  canHandle(field) {
    return field === "company_name" || field === "ico";
  },
  async fetch(ctx) {
    const ico = String(ctx.record.data.ico ?? "").trim();
    const company = String(ctx.record.data.company_name ?? "").trim();
    if (!ico && !company) return null;
    return {
      source: "finstat-orsr-stub",
      value: {
        company_name: company || null,
        ico: ico || null,
        status: "todo-real-api",
      },
    };
  },
};

export const defaultEnrichmentProviders: EnrichmentProvider[] = [
  phoneValidationProvider,
  emailValidationProvider,
  katasterLookupProvider,
  finstatOrsrProvider,
];
