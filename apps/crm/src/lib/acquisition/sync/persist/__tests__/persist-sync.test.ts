import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  ACQUISITION_PERSIST_SYNC_ENV,
  createAcquisitionPersistWriter,
  isAcquisitionPersistSyncEnabled,
  persistAdGroup,
  persistKeyword,
  persistMetric,
  persistSearchTerm,
  SYNC_CONFLICT,
  SYNC_TABLES,
} from "..";
import type { PersistSupabase } from "../types";

type Captured = {
  table: string;
  row: Record<string, unknown>;
  onConflict: string;
};

function createMockDb() {
  const upserts: Captured[] = [];
  const db: PersistSupabase = {
    from(table) {
      return {
        async upsert(row, opts) {
          upserts.push({ table, row, onConflict: opts.onConflict });
          return { data: [row], error: null };
        },
      };
    },
  };
  return { db, upserts };
}

const tenant = {
  agency_id: "agency-a",
  acquisition_account_id: "acct-1",
  provider: "GOOGLE" as const,
  last_synced_at: "2026-08-15T12:00:00.000Z",
};

describe("ACQUISITION_PERSIST_SYNC flag", () => {
  it("defaults to false when unset, empty, or not the string true", () => {
    expect(isAcquisitionPersistSyncEnabled({})).toBe(false);
    expect(isAcquisitionPersistSyncEnabled({ [ACQUISITION_PERSIST_SYNC_ENV]: "" })).toBe(false);
    expect(isAcquisitionPersistSyncEnabled({ [ACQUISITION_PERSIST_SYNC_ENV]: "false" })).toBe(false);
    expect(isAcquisitionPersistSyncEnabled({ [ACQUISITION_PERSIST_SYNC_ENV]: "1" })).toBe(false);
    expect(isAcquisitionPersistSyncEnabled({ [ACQUISITION_PERSIST_SYNC_ENV]: "TRUE" })).toBe(false);
  });

  it("enables only for the exact string true", () => {
    expect(
      isAcquisitionPersistSyncEnabled({ [ACQUISITION_PERSIST_SYNC_ENV]: "true" }),
    ).toBe(true);
  });

  it("createAcquisitionPersistWriter returns null when flag is off", () => {
    const { db } = createMockDb();
    expect(createAcquisitionPersistWriter(db, {})).toBeNull();
    expect(
      createAcquisitionPersistWriter(db, { [ACQUISITION_PERSIST_SYNC_ENV]: "false" }),
    ).toBeNull();
  });
});

describe("persist upserts against mock DB", () => {
  it("does not touch the mock DB when the flag is off", async () => {
    const { db, upserts } = createMockDb();
    const off = { [ACQUISITION_PERSIST_SYNC_ENV]: "false" };

    const results = await Promise.all([
      persistAdGroup(db, { ...tenant, provider_ad_group_id: "ag-1" }, off),
      persistKeyword(
        db,
        {
          ...tenant,
          provider_keyword_id: "kw-1",
          provider_campaign_id: "c-1",
          provider_ad_group_id: "ag-1",
          keyword_text: "byt bratislava",
        },
        off,
      ),
      persistSearchTerm(
        db,
        {
          ...tenant,
          search_term: "predaj bytu",
          provider_campaign_id: "c-1",
          metric_date: "2026-08-14",
        },
        off,
      ),
      persistMetric(
        db,
        {
          ...tenant,
          entity_type: "campaign",
          provider_entity_id: "c-1",
          metric_date: "2026-08-14",
        },
        off,
      ),
    ]);

    expect(results.every((r) => r.ok && r.written === false && r.reason === "flag_off")).toBe(
      true,
    );
    expect(upserts).toHaveLength(0);
  });

  it("upserts all four tables on unique provider IDs when flag is true", async () => {
    const { db, upserts } = createMockDb();
    const on = { [ACQUISITION_PERSIST_SYNC_ENV]: "true" };
    const writer = createAcquisitionPersistWriter(db, on);
    expect(writer).not.toBeNull();

    const ad = await writer!.persistAdGroup({
      ...tenant,
      provider_ad_group_id: "ag-1",
      provider_campaign_id: "c-1",
      name: "RK A groups",
      status: "ENABLED",
    });
    const kw = await writer!.persistKeyword({
      ...tenant,
      provider_keyword_id: "kw-1",
      provider_campaign_id: "c-1",
      provider_ad_group_id: "ag-1",
      keyword_text: "byt bratislava",
      match_type: "PHRASE",
    });
    const st = await writer!.persistSearchTerm({
      ...tenant,
      search_term: "predaj bytu",
      provider_campaign_id: "c-1",
      metric_date: "2026-08-14",
      impressions: 10,
    });
    const met = await writer!.persistMetric({
      ...tenant,
      entity_type: "ad_group",
      provider_entity_id: "ag-1",
      metric_date: "2026-08-14",
      clicks: 2,
    });

    expect([ad, kw, st, met].every((r) => r.ok && r.written)).toBe(true);
    expect(upserts.map((u) => u.table)).toEqual([
      SYNC_TABLES.adGroups,
      SYNC_TABLES.keywords,
      SYNC_TABLES.searchTerms,
      SYNC_TABLES.metrics,
    ]);
    expect(upserts.map((u) => u.onConflict)).toEqual([
      SYNC_CONFLICT.adGroups,
      SYNC_CONFLICT.keywords,
      SYNC_CONFLICT.searchTerms,
      SYNC_CONFLICT.metrics,
    ]);
    expect(upserts[0]?.row.agency_id).toBe("agency-a");
    expect(upserts[0]?.row.acquisition_account_id).toBe("acct-1");
    expect(upserts[1]?.row.provider_keyword_id).toBe("kw-1");
    expect(upserts[2]?.row.provider_search_term_id).toBe("predaj bytu|c-1|2026-08-14");
    expect(upserts[3]?.row.provider_metric_id).toBe("ad_group|ag-1|2026-08-14");
  });

  it("synthesizes keyword provider id when criterion id is missing", async () => {
    const { db, upserts } = createMockDb();
    const on = { [ACQUISITION_PERSIST_SYNC_ENV]: "true" };
    await persistKeyword(
      db,
      {
        ...tenant,
        provider_keyword_id: null,
        provider_campaign_id: "c-1",
        provider_ad_group_id: "ag-1",
        keyword_text: "dom kosice",
      },
      on,
    );
    expect(upserts[0]?.row.provider_keyword_id).toBe("criterion:c-1:ag-1:dom kosice");
  });

  it("repeats the same provider key as a second upsert (idempotent)", async () => {
    const { db, upserts } = createMockDb();
    const on = { [ACQUISITION_PERSIST_SYNC_ENV]: "true" };
    const row = { ...tenant, provider_ad_group_id: "ag-dup", name: "first" };
    await persistAdGroup(db, row, on);
    await persistAdGroup(db, { ...row, name: "second" }, on);
    expect(upserts).toHaveLength(2);
    expect(upserts[0]?.onConflict).toBe(SYNC_CONFLICT.adGroups);
    expect(upserts[1]?.row.provider_ad_group_id).toBe("ag-dup");
    expect(upserts[1]?.row.name).toBe("second");
  });

  it("sync workers do not import the persist module while the flag defaults off", () => {
    const dir = resolve(__dirname, "../..");
    for (const file of [
      "ad-groups.ts",
      "campaigns.ts",
      "keywords.ts",
      "metrics.ts",
      "search-terms.ts",
    ]) {
      const src = readFileSync(resolve(dir, file), "utf8");
      expect(src).not.toMatch(/sync\/persist|from ["']\.\/persist/);
    }
  });

  it("does not import Google Ads workers or the live client", () => {
    const src = readFileSync(resolve(__dirname, "../upsert.ts"), "utf8")
      + readFileSync(resolve(__dirname, "../index.ts"), "utf8")
      + readFileSync(resolve(__dirname, "../flag.ts"), "utf8");
    expect(src).not.toMatch(/google-ads-client/);
    expect(src).not.toMatch(/from "\.\.\/ad-groups"/);
    expect(src).not.toMatch(/from "\.\.\/keywords"/);
    expect(src).not.toMatch(/from "\.\.\/search-terms"/);
    expect(src).not.toMatch(/from "\.\.\/metrics"/);
    expect(src).not.toMatch(/mutate/i);
  });
});