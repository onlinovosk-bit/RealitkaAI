import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ageDaysSince,
  buildReturnStep,
  classifyPriceChange,
  classifyRepeatView,
  listingAgeBucket,
} from "../return-signal";
import { recordKnownContactView } from "../record-known-view";
import {
  recordPriceChangeSteps,
  recordRepeatView,
  scanListingAge,
  writeReturnStep,
} from "../write-return-step";

const DAY = 86_400_000;

type Row = Record<string, unknown>;

function fakeDb(tables: Record<string, Row[]>) {
  const inserts: { table: string; row: Row }[] = [];
  const db = {
    inserts,
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let mode: "select" | "insert" = "select";
      const chain = {
        select() {
          return chain;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return chain;
        },
        gte() {
          return chain;
        },
        lte() {
          return chain;
        },
        in(key: string, value: unknown[]) {
          filters[key] = value;
          return chain;
        },
        or() {
          return chain;
        },
        limit() {
          return chain;
        },
        insert(row: Row) {
          mode = "insert";
          inserts.push({ table, row });
          tables[table] = [...(tables[table] ?? []), row];
          return chain;
        },
        then(resolve: (value: unknown) => void) {
          if (mode === "insert") {
            resolve({ error: null, data: null });
            return;
          }
          let rows = tables[table] ?? [];
          for (const [key, value] of Object.entries(filters)) {
            rows = Array.isArray(value)
              ? rows.filter((row) => value.includes(row[key]))
              : rows.filter((row) => row[key] === value);
          }
          resolve({ data: rows, error: null, count: rows.length });
        },
      };
      return chain;
    },
  };
  return db;
}

const lead = {
  id: "lead-1",
  name: "Anna",
  email: "anna@example.com",
  status: "Nový",
  assigned_profile_id: "profile-1",
};

describe("return signal classifier", () => {
  it("treats only a later view as a return", () => {
    expect(classifyRepeatView(0)).toBe(false);
    expect(classifyRepeatView(1)).toBe(true);
  });

  it("treats a numeric price difference as a change", () => {
    expect(classifyPriceChange(null, 100)).toBe(false);
    expect(classifyPriceChange(100, 100)).toBe(false);
    expect(classifyPriceChange(100, 90)).toBe(true);
    expect(classifyPriceChange(90, 100)).toBe(true);
  });

  it("fires listing age only on the crossing day and the next day", () => {
    expect(listingAgeBucket(13)).toBeNull();
    expect(listingAgeBucket(14)).toBe(14);
    expect(listingAgeBucket(15)).toBe(14);
    expect(listingAgeBucket(16)).toBeNull();
    expect(listingAgeBucket(30)).toBe(30);
    expect(listingAgeBucket(31)).toBe(30);
    expect(listingAgeBucket(60)).toBe(60);
    expect(listingAgeBucket(61)).toBe(60);
    expect(listingAgeBucket(62)).toBeNull();
  });

  it("writes the reason into the draft and says it is not sent", () => {
    const step = buildReturnStep({
      kind: "price_change",
      propertyId: "prop-1",
      propertyTitle: "Byt",
      contactName: "Anna",
      prevPrice: 100000,
      nextPrice: 95000,
    });
    expect(step?.body).toContain("100000 €");
    expect(step?.body).toContain("95000 €");
    expect(step?.body).toContain("neodošle");
    expect(step?.title).toBe("Ďalší krok: zmena ceny · prop-1");
  });
});

describe("writeReturnStep", () => {
  it("does not call a sender", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/signals/write-return-step.ts"), "utf8");
    expect(src).not.toContain("sendMessage");
  });

  it("stores an open task and an unsent draft", async () => {
    const db = fakeDb({ leads: [{ ...lead }] });
    const step = buildReturnStep({
      kind: "repeat_view",
      propertyId: "prop-1",
      propertyTitle: "Byt",
      contactName: "Anna",
    })!;
    const first = await writeReturnStep(db, { leadId: "lead-1", step, propertyId: "prop-1" });
    expect(first).toEqual({ wrote: true });
    expect(db.inserts.map((row) => row.table)).toEqual(["tasks", "activities"]);
    expect(db.inserts[0].row).toMatchObject({ status: "open", title: step.title });
    expect(db.inserts[1].row.meta).toMatchObject({
      draft: true,
      requires_approval: true,
      recipient: "anna@example.com",
      agent_id: "REVOLIS-RETURN-SIGNAL",
    });

    const second = await writeReturnStep(db, { leadId: "lead-1", step, propertyId: "prop-1" });
    expect(second).toEqual({ wrote: false, reason: "open_task" });
    expect(db.inserts).toHaveLength(2);
  });

  it("keeps a draft without an address off the send button", async () => {
    const db = fakeDb({ leads: [{ ...lead, email: null }] });
    const step = buildReturnStep({ kind: "listing_age", propertyId: "prop-1", ageBucket: 30, contactName: "Anna" })!;
    await writeReturnStep(db, { leadId: "lead-1", step, propertyId: "prop-1" });
    expect(db.inserts[1].row.meta).not.toHaveProperty("recipient");
  });

  it("skips a closed lead", async () => {
    const db = fakeDb({ leads: [{ ...lead, status: "Stratený" }] });
    const step = buildReturnStep({ kind: "repeat_view", propertyId: "prop-1" })!;
    const result = await writeReturnStep(db, { leadId: "lead-1", step, propertyId: "prop-1" });
    expect(result).toEqual({ wrote: false, reason: "closed_lead" });
    expect(db.inserts).toHaveLength(0);
  });
});

describe("signal producers", () => {
  it("writes a price step for a matched lead and ignores an unchanged price", async () => {
    const db = fakeDb({
      leads: [{ ...lead }],
      lead_property_matches: [{ lead_id: "lead-1", property_id: "prop-1", property_title: "Byt" }],
    });
    expect(
      await recordPriceChangeSteps(db, { propertyId: "prop-1", prevPrice: 100, nextPrice: 100 }),
    ).toBe(0);
    expect(
      await recordPriceChangeSteps(db, { propertyId: "prop-1", prevPrice: 100, nextPrice: 80 }),
    ).toBe(1);
    expect(db.inserts[0].row.title).toBe("Ďalší krok: zmena ceny · prop-1");
  });

  it("writes a return only on the second identified view", async () => {
    const payload = { lead_id: "lead-1", property_id: "prop-1" };
    const once = fakeDb({
      leads: [{ ...lead }],
      events: [{ event_type: "property_viewed" }],
      properties: [{ id: "prop-1", title: "Byt" }],
    });
    expect(await recordRepeatView(once, payload)).toMatchObject({ reason: "first_view" });

    const twice = fakeDb({
      leads: [{ ...lead }],
      events: [{ event_type: "property_viewed" }, { event_type: "property_viewed" }],
      properties: [{ id: "prop-1", title: "Byt" }],
    });
    expect(await recordRepeatView(twice, payload)).toEqual({ wrote: true });
    expect(twice.inserts[0].row.title).toBe("Ďalší krok: návrat · prop-1");
  });

  it("writes an age step only for an active listing in the window", async () => {
    const now = new Date("2026-10-11T06:00:00.000Z");
    const db = fakeDb({
      leads: [{ ...lead }],
      properties: [
        { id: "young", title: "Nový", status: "Aktívna", created_at: new Date(now.getTime() - 10 * DAY).toISOString() },
        { id: "due", title: "Starší", status: "Aktívna", created_at: new Date(now.getTime() - 14 * DAY).toISOString() },
        { id: "sold", title: "Predaný", status: "Predaná", created_at: new Date(now.getTime() - 30 * DAY).toISOString() },
      ],
      lead_property_matches: [
        { lead_id: "lead-1", property_id: "due", property_title: "Starší" },
        { lead_id: "lead-1", property_id: "sold", property_title: "Predaný" },
      ],
    });
    const result = await scanListingAge(db, now);
    expect(ageDaysSince(new Date(now.getTime() - 14 * DAY).toISOString(), now)).toBe(14);
    expect(result).toEqual({ considered: 1, wrote: 1 });
    expect(db.inserts[0].row.title).toBe("Ďalší krok: inzerát 14 dní · due");
  });
});

const intentLead = {
  ...lead,
  agency_id: "agency-1",
};

function knownViewDb(overrides?: {
  lead?: Row;
  property?: Row;
  intents?: Row[];
}) {
  return fakeDb({
    buyer_intents: overrides?.intents ?? [{ id: "11111111-1111-4111-8111-111111111111", lead_id: "lead-1" }],
    leads: [overrides?.lead ?? { ...intentLead }],
    properties: [
      overrides?.property ?? {
        id: "prop-1",
        title: "Byt",
        agency_id: "agency-1",
        status: "Aktívna",
      },
    ],
    events: [],
    tasks: [],
    activities: [],
  });
}

describe("known contact view", () => {
  const intentId = "11111111-1111-4111-8111-111111111111";

  it("does not call a sender", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/signals/record-known-view.ts"), "utf8");
    expect(source).not.toContain("sendMessage");
  });

  it("ignores an intent that is not a known lead", async () => {
    const db = knownViewDb({ intents: [] });
    const result = await recordKnownContactView(db, { intentId, propertyId: "prop-1" });
    expect(result).toEqual({ recorded: false, reason: "unknown_intent" });
    expect(db.inserts).toHaveLength(0);
  });

  it("ignores a listing from another agency", async () => {
    const db = knownViewDb({
      property: { id: "prop-1", title: "Byt", agency_id: "agency-2", status: "Aktívna" },
    });
    const result = await recordKnownContactView(db, { intentId, propertyId: "prop-1" });
    expect(result.reason).toBe("other_agency");
    expect(db.inserts).toHaveLength(0);
  });

  it("records the first open and writes the step only on the second", async () => {
    const db = knownViewDb();
    const first = await recordKnownContactView(db, { intentId, propertyId: "prop-1" });
    expect(first).toMatchObject({ recorded: true, agencyId: "agency-1" });
    expect(db.inserts.filter((row) => row.table === "events")).toHaveLength(1);
    expect(db.inserts.find((row) => row.table === "events")?.row.payload).toEqual({
      lead_id: "lead-1",
      property_id: "prop-1",
      source: "buyer_intent",
    });
    expect(db.inserts.filter((row) => row.table === "tasks")).toHaveLength(0);

    const second = await recordKnownContactView(db, { intentId, propertyId: "prop-1" });
    expect(second.recorded).toBe(true);
    expect(db.inserts.filter((row) => row.table === "tasks")).toHaveLength(1);
    expect(db.inserts.find((row) => row.table === "tasks")?.row.title).toBe(
      "Ďalší krok: návrat · prop-1",
    );
  });
});
