// ================================================================
// BOD 10 (zadanie foundera 2026-10-15) — 14 dni zadarmo BEZ karty.
//
// Registracna stranka toto klientovi slubuje doslovne:
//   "14 dni zadarmo, bez platobnej karty. Po skonceni sa skusobna verzia sama
//    vypne — nic sa neuctuje automaticky."
//
// Testy nizsie drzia presne ten slub a jeho dve hrany:
//   1. po 14 dnoch sa zapis vypne (ucet je len na citanie, data zostavaju),
//   2. vypnut sa ma iba tomu, kto NEPLATI — fakturovany klient nema v Stripe
//      ziadne predplatne, takze pred 2026-10-15 spadol do rovnakej vetvy ako
//      vyprsany trial. Zmerane na PROD 2026-10-15: 7 zo 7 agentur nema
//      `stripe_subscription_id`, teda sa to tykalo uplne vsetkych.
// ================================================================
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  accessLevelFrom,
  agencyPaysOutsideStripe,
  resolveTrialEndMs,
  trialGraceFrom,
  type TrialGraceInput,
} from "@/lib/saas-ops";
import { isPayingAgency } from "@/lib/customer-health/paid";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 15, 12, 0, 0);

/** Samoobsluzny trial: ziadne Stripe predplatne, ziadna faktura, iba datum konca. */
function trialInput(overrides: Partial<TrialGraceInput> = {}): TrialGraceInput {
  return {
    lookupFailed: false,
    hasSubscription: false,
    subscriptionStatus: "",
    currentPeriodEndMs: null,
    trialEndMs: NOW + 14 * DAY,
    paysOutsideStripe: false,
    graceDays: 7,
    nowMs: NOW,
    ...overrides,
  };
}

describe("trial bez karty — 14 dni plneho pristupu", () => {
  it("prvy den: plny pristup a odpocet 14 dni", () => {
    const state = trialGraceFrom(trialInput());
    expect(state.state).toBe("trial");
    expect(state.trialDaysLeft).toBe(14);
    expect(accessLevelFrom(state.state)).toBe("full");
  });

  it("kazdy den trialu az po posledny je plny pristup", () => {
    for (let elapsed = 0; elapsed < 14; elapsed += 1) {
      const state = trialGraceFrom(trialInput({ nowMs: NOW + elapsed * DAY }));
      expect(state.state, `den ${elapsed}`).toBe("trial");
      expect(accessLevelFrom(state.state), `den ${elapsed}`).toBe("full");
    }
  });

  it("hodina pred koncom je este trial", () => {
    const state = trialGraceFrom(trialInput({ nowMs: NOW + 14 * DAY - 3_600_000 }));
    expect(state.state).toBe("trial");
    expect(state.trialDaysLeft).toBe(1);
  });
});

describe("po 14 dnoch sa trial sam vypne — a nic sa neuctuje", () => {
  it("v minute vyprsania je ucet len na citanie", () => {
    const state = trialGraceFrom(trialInput({ nowMs: NOW + 14 * DAY }));
    expect(state.state).toBe("limited");
    expect(state.trialDaysLeft).toBe(0);
    expect(accessLevelFrom(state.state)).toBe("read_only");
  });

  it("mesiac po vyprsani stale len na citanie, nie blocked", () => {
    // `blocked` je stav po neuhradenej fakture. Trial bez karty ziadnu fakturu
    // nema, takze sa don nesmie dostat — klient by videl vyzvu na obnovu platby,
    // ktora nikdy nevznikla.
    const state = trialGraceFrom(trialInput({ nowMs: NOW + 45 * DAY }));
    expect(state.state).toBe("limited");
    expect(state.message).toContain("Trial skončil");
  });

  it("bez predplatneho sa nikdy nevrati stav, ktory znamena dlh", () => {
    // grace aj blocked vznikaju vylucne z past_due / unpaid predplatneho.
    const dlzne = new Set(["grace", "blocked"]);
    for (let elapsed = 0; elapsed <= 60; elapsed += 1) {
      const state = trialGraceFrom(trialInput({ nowMs: NOW + elapsed * DAY }));
      expect(dlzne.has(state.state), `den ${elapsed}`).toBe(false);
    }
  });

  it("samoobsluzna registracia nezaklada v Stripe nic, co by sa dalo zuctovat", () => {
    // Strukturalny dokaz k "nic sa neuctuje": funkcia, ktora zaklada agenturu
    // pri registracii, nepise ziadne Stripe ID a plan necha na Free.
    const sql = readFileSync(
      join(__dirname, "../../../supabase/migrations/20261006120000_self_serve_signup_foundation.sql"),
      "utf8",
    );
    const from = sql.indexOf("CREATE OR REPLACE FUNCTION public.bootstrap_self_serve_agency");
    const to = sql.indexOf("REVOKE ALL ON FUNCTION public.bootstrap_self_serve_agency");
    expect(from, "funkcia bootstrap_self_serve_agency sa v migracii nenasla").toBeGreaterThan(-1);
    expect(to, "koniec tela funkcie sa nenasiel").toBeGreaterThan(from);
    const body = sql.slice(from, to);
    expect(body).not.toMatch(/stripe_customer_id/);
    expect(body).not.toMatch(/stripe_subscription_id/);
    expect(body).not.toMatch(/subscription_status/);
    expect(body).toContain("'Free'");
    expect(body).toContain("now() + make_interval(days => v_days)");
  });
});

describe("vypnut sa ma iba tomu, kto neplati", () => {
  it("fakturovany klient bez Stripe predplatneho ostava aktivny", () => {
    const state = trialGraceFrom(trialInput({ paysOutsideStripe: true, nowMs: NOW + 400 * DAY }));
    expect(state.state).toBe("active");
    expect(accessLevelFrom(state.state)).toBe("full");
  });

  it("bez tohto priznaku by ten isty klient spadol do read-only", () => {
    // Toto je presne regresia, ktoru test chrani: rovnaky vstup, iba
    // paysOutsideStripe = false.
    const state = trialGraceFrom(trialInput({ paysOutsideStripe: false, nowMs: NOW + 400 * DAY }));
    expect(accessLevelFrom(state.state)).toBe("read_only");
  });

  it("riadok agentury zo samoobsluznej registracie sa ako platiaci NERATA", () => {
    // Presne tie hodnoty, ktore zapisuje bootstrap_self_serve_agency.
    expect(
      isPayingAgency({ plan: "Free", manual_plan: null, subscription_status: null, account_tier: "free" }),
    ).toBe(false);
  });

  it("rucne pridelený plán aj aktívne predplatné sa ako platiaci ráta", () => {
    expect(isPayingAgency({ manual_plan: "market_vision" })).toBe(true);
    expect(isPayingAgency({ subscription_status: "active" })).toBe(true);
  });

  it("zruseny ucet sa za platiaci neratá, aj ked mu v DB zostal plan", () => {
    // `isPayingAgency` by takyto riadok este vyhodnotil ako platiaci (staci mu
    // plan iny nez free), takze by zruseny ucet zostal otvoreny.
    expect(
      agencyPaysOutsideStripe({ plan: "Pro", account_tier: "pro", subscription_status: "canceled" }),
    ).toBe(false);
    expect(agencyPaysOutsideStripe({ plan: "Pro", subscription_status: "unpaid" })).toBe(false);
    expect(agencyPaysOutsideStripe({ manual_plan: "market_vision", subscription_status: null })).toBe(true);
  });

  it("Stripe predplatne ma prednost pred priznakom agentury", () => {
    // Ked Stripe predplatne existuje, rozhoduje jeho stav — inak by zabudnuty
    // manual_plan prebil zruseny plateny ucet.
    const state = trialGraceFrom(
      trialInput({ paysOutsideStripe: true, hasSubscription: true, subscriptionStatus: "canceled" }),
    );
    expect(state.state).toBe("limited");
  });
});

describe("vypadok Stripe nie je zistenie o klientovi", () => {
  it("neoverene predplatne necha pristup plny", () => {
    const state = trialGraceFrom(trialInput({ lookupFailed: true, nowMs: NOW + 400 * DAY }));
    expect(state.state).toBe("unknown");
    expect(accessLevelFrom(state.state)).toBe("full");
  });
});

describe("Stripe predplatne — stavy ostavaju nezmenene", () => {
  const withSub = (status: string, extra: Partial<TrialGraceInput> = {}) =>
    trialGraceFrom(trialInput({ hasSubscription: true, subscriptionStatus: status, ...extra }));

  it("active a trialing su plny pristup", () => {
    expect(withSub("active").state).toBe("active");
    expect(withSub("trialing").state).toBe("active");
  });

  it("past_due v ochrannej lehote je grace, po nej blocked", () => {
    expect(withSub("past_due", { currentPeriodEndMs: NOW - 1 * DAY }).state).toBe("grace");
    expect(withSub("past_due", { currentPeriodEndMs: NOW - 8 * DAY }).state).toBe("blocked");
    expect(withSub("unpaid", { currentPeriodEndMs: NOW - 8 * DAY }).state).toBe("blocked");
  });

  it("neznamy stav predplatneho je limited, nie plny pristup", () => {
    expect(withSub("incomplete").state).toBe("limited");
    expect(accessLevelFrom(withSub("incomplete").state)).toBe("read_only");
  });
});

describe("koniec trialu drzi agentura, nie datum vzniku auth uctu", () => {
  it("trial_ends_at agentury ma prednost", () => {
    const end = resolveTrialEndMs({
      agencyTrialEndsAt: new Date(NOW + 10 * DAY).toISOString(),
      userCreatedAt: new Date(NOW - 300 * DAY).toISOString(),
      trialDays: 14,
      nowMs: NOW,
    });
    expect(end).toBe(NOW + 10 * DAY);
  });

  it("bez trial_ends_at sa odvodi z auth uctu (historicke spravanie)", () => {
    const end = resolveTrialEndMs({
      agencyTrialEndsAt: null,
      userCreatedAt: new Date(NOW).toISOString(),
      trialDays: 14,
      nowMs: NOW,
    });
    expect(end).toBe(NOW + 14 * DAY);
  });

  it("neplatny datum agentury nezhodi vypocet", () => {
    const end = resolveTrialEndMs({
      agencyTrialEndsAt: "nie je datum",
      userCreatedAt: new Date(NOW).toISOString(),
      trialDays: 14,
      nowMs: NOW,
    });
    expect(end).toBe(NOW + 14 * DAY);
  });
});
