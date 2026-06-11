import { describe, expect, it } from "vitest";
import {
  canManageTeamArea,
  getVisibleLeadsForProfile,
  getVisibleTeamsForProfile,
} from "@/lib/team-visibility";

const teams = [
  { id: "t-1", name: "Team A" },
  { id: "t-2", name: "Team B" },
];

const profiles = [
  { id: "p-owner", role: "owner" as const, teamId: null },
  { id: "p-mgr", role: "manager" as const, teamId: "t-1" },
  { id: "p-agent", role: "agent" as const, teamId: "t-1" },
];

const leads = [
  { id: "l-1", assignedProfileId: "p-agent" },
  { id: "l-2", assignedProfileId: "p-mgr" },
];

describe("[verification] Team visibility gating", () => {
  it("owner sees all teams and leads", () => {
    expect(getVisibleTeamsForProfile(profiles[0], teams)).toHaveLength(2);
    expect(getVisibleLeadsForProfile(profiles[0], leads as never, profiles as never)).toHaveLength(2);
    expect(canManageTeamArea(profiles[0])).toBe(true);
  });

  it("manager sees only own team scope", () => {
    expect(getVisibleTeamsForProfile(profiles[1], teams)).toHaveLength(1);
    expect(getVisibleTeamsForProfile(profiles[1], teams)[0]?.id).toBe("t-1");
    const visible = getVisibleLeadsForProfile(profiles[1], leads as never, profiles as never);
    expect(visible.map((l) => l.id).sort()).toEqual(["l-1", "l-2"]);
  });

  it("agent cannot manage team area", () => {
    expect(canManageTeamArea(profiles[2])).toBe(false);
  });
});
