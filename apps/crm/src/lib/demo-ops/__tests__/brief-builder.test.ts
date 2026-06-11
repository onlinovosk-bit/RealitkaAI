import { describe, expect, it } from "vitest";
import { buildPreDemoBriefText } from "../brief-builder";

describe("buildPreDemoBriefText", () => {
  it("includes prospect context and calc loss", () => {
    const { text } = buildPreDemoBriefText({
      inviteeName: "Ján Novák",
      inviteeEmail: "jan@rkpresov.sk",
      scheduledAt: "2026-06-12T10:00:00.000Z",
      utm: { goals: ["leads"], calcLossMonthly: 1800 },
      prospect: {
        nazov: "RK Prešov",
        mesto: "Prešov",
        kraj: "Prešovský",
        icp_score: 72,
        team_size_estimate: 5,
        portals_detected: ["nehnutelnosti.sk"],
      },
      unknownProspect: false,
    });
    expect(text).toContain("RK Prešov");
    expect(text).toContain("1800");
    expect(text).toContain("3 demo akcenty");
  });

  it("flags unknown prospect when no match", () => {
    const { text } = buildPreDemoBriefText({
      inviteeName: "Host",
      inviteeEmail: "a@gmail.com",
      scheduledAt: null,
      utm: { goals: [], calcLossMonthly: null },
      prospect: null,
      unknownProspect: true,
    });
    expect(text).toContain("neznámy");
  });
});
