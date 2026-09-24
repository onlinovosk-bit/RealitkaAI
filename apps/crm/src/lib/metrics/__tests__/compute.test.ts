import { describe, expect, it } from "vitest";
import {
  computeActiveSeats,
  computeCockpitAttach,
  computeCreditActivity,
  computeCreditRevenuePct,
  computeFounderMetrics,
  computeMrrBreakdown,
  SMOLKO_MANUAL_PLAN_MRR_EUR,
} from "../compute";
import { METRICS_GUARDRAILS } from "../guardrails";
import { METRICS_FIXTURE_AGENCIES, METRICS_FIXTURE_LEDGER } from "./fixtures";

describe("founder metrics compute", () => {
  it("separates Smolko manual_plan MRR at 199 €", () => {
    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    expect(mrr.smolkoAgencyCount).toBe(1);
    expect(mrr.smolkoManualEur).toBe(SMOLKO_MANUAL_PLAN_MRR_EUR);
    expect(mrr.seatRevenueEur).toBe(4 * 71 + 2 * 79);
    expect(mrr.cockpitRevenueEur).toBe(349);
    expect(mrr.totalEur).toBe(199 + 4 * 71 + 2 * 79 + 349);
  });

  it("counts active seats excluding canceled agencies", () => {
    expect(computeActiveSeats(METRICS_FIXTURE_AGENCIES)).toBe(5 + 4 + 2);
  });

  it("computes cockpit attach among 3+ seat agencies", () => {
    const attach = computeCockpitAttach(METRICS_FIXTURE_AGENCIES);
    expect(attach.eligible).toBe(2);
    expect(attach.attached).toBe(2);
    expect(attach.pct).toBe(100);
  });

  it("aggregates grant, spend, purchase from ledger seeds", () => {
    const activity = computeCreditActivity(
      METRICS_FIXTURE_LEDGER,
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-07-01T00:00:00.000Z"),
    );
    expect(activity.granted).toBe(100);
    expect(activity.purchased).toBe(150);
    expect(activity.spent).toBe(12);
    expect(activity.purchaseRevenueEur).toBe(129);
  });

  it("credit revenue % uses MRR + top-up revenue", () => {
    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    const pct = computeCreditRevenuePct(mrr.totalEur, 129);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(0);
  });

  it("builds full snapshot with guardrail bands", () => {
    const snapshot = computeFounderMetrics({
      agencies: METRICS_FIXTURE_AGENCIES,
      ledger: METRICS_FIXTURE_LEDGER,
      aiCostDaily: [
        { agency_id: "a1", day_utc: "2026-06-10", action_count: 12, cost_eur: 4.5 },
        { agency_id: "a2", day_utc: "2026-06-10", action_count: 8, cost_eur: 1.5 },
        // mimo mesačného okna — nesmie sa započítať
        { agency_id: "a1", day_utc: "2026-05-31", action_count: 99, cost_eur: 50 },
      ],
      aiCostDailyAvailable: true,
      asOf: new Date("2026-06-15T12:00:00.000Z"),
    });

    expect(snapshot.periodLabel).toBe("2026-06");
    expect(snapshot.guardrails.cockpitAttachBand).toBe("pass");
    expect(snapshot.guardrails.nrrBand).toBe("unavailable");
    expect(snapshot.aiCost.available).toBe(true);
    // dva riadky, jeden deň
    expect(snapshot.aiCost.days).toBe(1);
    expect(snapshot.aiCost.actionCount).toBe(20);
    expect(snapshot.aiCost.costEur).toBe(6);
    // marža stojí na MRR, nie na kreditovom retaile
    expect(snapshot.aiCost.mrrEur).toBe(snapshot.mrr.totalEur);
    expect(snapshot.aiCost.marginEur).toBe(snapshot.mrr.totalEur - 6);
    expect(snapshot.aiCost.costGap).toBe(false);
  });

  it("marža je null keď akcie prebehli, ale náklad sa nezapísal", () => {
    const snapshot = computeFounderMetrics({
      agencies: METRICS_FIXTURE_AGENCIES,
      ledger: METRICS_FIXTURE_LEDGER,
      aiCostDaily: [
        { agency_id: "a1", day_utc: "2026-06-10", action_count: 42, cost_eur: 0 },
      ],
      aiCostDailyAvailable: true,
      asOf: new Date("2026-06-15T12:00:00.000Z"),
    });

    expect(snapshot.aiCost.actionCount).toBe(42);
    expect(snapshot.aiCost.costEur).toBe(0);
    expect(snapshot.aiCost.costGap).toBe(true);
    expect(snapshot.aiCost.marginEur).toBeNull();
  });

  it("marža je null keď pohľad ai_cost_daily nie je dostupný", () => {
    const snapshot = computeFounderMetrics({
      agencies: METRICS_FIXTURE_AGENCIES,
      ledger: METRICS_FIXTURE_LEDGER,
      aiCostDaily: [],
      aiCostDailyAvailable: false,
      asOf: new Date("2026-06-15T12:00:00.000Z"),
    });

    expect(snapshot.aiCost.available).toBe(false);
    expect(snapshot.aiCost.marginEur).toBeNull();
    expect(snapshot.aiCost.costEur).toBe(0);
  });

  it("fails cockpit attach guardrail below 40 %", () => {
    const agencies = [
      {
        ...METRICS_FIXTURE_AGENCIES[2],
        seats: 5,
        owner_cockpit_active: false,
        cockpit_tier: null,
      },
      {
        ...METRICS_FIXTURE_AGENCIES[1],
        seats: 4,
        owner_cockpit_active: false,
        cockpit_tier: null,
      },
    ];
    const attach = computeCockpitAttach(agencies);
    expect(attach.pct).toBe(0);
    expect(attach.pct).toBeLessThan(METRICS_GUARDRAILS.cockpitAttachMinPct);
  });
});
