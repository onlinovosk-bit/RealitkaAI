import { describe, expect, it } from "vitest";
import {
  computeActiveSeats,
  computeCockpitAttach,
  computeCreditActivity,
  computeCreditRevenuePct,
  computeFounderMetrics,
  computeMrrBreakdown,
  OFFICE_MONTHLY_EUR,
  payingBasis,
} from "../compute";
import { isPayingAgency } from "@/lib/customer-health/paid";
import { METRICS_GUARDRAILS } from "../guardrails";
import { METRICS_FIXTURE_AGENCIES, METRICS_FIXTURE_LEDGER } from "./fixtures";

describe("founder metrics compute", () => {
  it("MRR je 199 € za každú platiacu kanceláriu, seaty sa nepočítajú", () => {
    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    // Smolko, RK Bratislava, RK Košice. Churned RK má canceled, Revolis System Free.
    expect(mrr.billedAgencyCount).toBe(3);
    expect(mrr.officeMonthlyEur).toBe(OFFICE_MONTHLY_EUR);
    expect(mrr.totalEur).toBe(3 * 199);
    expect(mrr.billed.every((a) => a.monthlyEur === 199)).toBe(true);
  });

  it("interný Free tenant sa do MRR nepočíta", () => {
    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    expect(mrr.billed.map((a) => a.name)).not.toContain("Revolis System");
  });

  it("každá účtovaná kancelária nesie dôkaz, na ktorom to stojí", () => {
    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    const smolko = mrr.billed.find((a) => a.name === "Reality Smolko");
    expect(smolko?.basis).toBe("manual_plan=market_vision");
    const kosice = mrr.billed.find((a) => a.name === "RK Košice");
    expect(kosice?.basis).toBe("subscription_status=active");
    expect(mrr.billed.every((a) => a.basis.length > 0)).toBe(true);
  });

  it("zrušené predplatné nie je tržba, ani keď ostal názov balíka", () => {
    const churned = METRICS_FIXTURE_AGENCIES.find((a) => a.name === "Churned RK")!;
    expect(churned.subscription_status).toBe("canceled");
    expect(churned.plan).toBe("team");
    // Presne tu sa MRR zámerne rozchádza s isPayingAgency — viď payingBasis().
    expect(isPayingAgency(churned)).toBe(true);
    expect(payingBasis(churned)).toBeNull();

    const mrr = computeMrrBreakdown(METRICS_FIXTURE_AGENCIES);
    expect(mrr.billed.map((a) => a.name)).not.toContain("Churned RK");
  });

  it("mimo zrušených payingBasis súhlasí s isPayingAgency", () => {
    const notChurned = METRICS_FIXTURE_AGENCIES.filter(
      (a) => !["canceled", "cancelled", "inactive"].includes(a.subscription_status ?? ""),
    );
    expect(notChurned.length).toBeGreaterThan(0);
    for (const row of notChurned) {
      expect(payingBasis(row) !== null).toBe(isPayingAgency(row));
    }
  });

  it("counts active seats excluding canceled agencies", () => {
    // Prevádzková metrika, nie tržbová — seaty už MRR neurčujú.
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
