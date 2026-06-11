import { describe, expect, it, vi, beforeEach } from "vitest";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";

const selectMock = vi.fn();
const eqMock = vi.fn();
const orderMock = vi.fn();
const limitMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: selectMock,
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }),
    }),
  }),
  createClient: vi.fn(),
}));

import { getCeoCommandNotifications } from "@/lib/notifications/store";

const SEED_NOTIFICATIONS = [
  {
    id: "n-ceo-1",
    agency_id: "agency-1",
    profile_id: null,
    type: "ceo_command",
    priority: "high",
    title: "Týždenný výkon tímu",
    body: "Pipeline +12 %, 2 HOT leady bez kontaktu 48h.",
    data: { week: 23 },
    read_at: null,
    created_at: "2026-06-10T08:00:00Z",
    expires_at: null,
  },
  {
    id: "n-ceo-2",
    agency_id: "agency-1",
    profile_id: null,
    type: "ceo_command",
    priority: "normal",
    title: "Riaditeľský brief — pondelok",
    body: "TOP AKCIA: Zavolaj Kováč dnes.",
    data: null,
    read_at: "2026-06-09T10:00:00Z",
    created_at: "2026-06-09T07:00:00Z",
    expires_at: null,
  },
];

describe("[verification] CEO Command role gating", () => {
  it("allows owner_vision and owner_protocol ui_role", () => {
    expect(isCeoCommandOwner({ ui_role: "owner_vision" })).toBe(true);
    expect(isCeoCommandOwner({ ui_role: "owner_protocol" })).toBe(true);
  });

  it("allows role owner regardless of ui_role", () => {
    expect(isCeoCommandOwner({ role: "owner", ui_role: "agent" })).toBe(true);
  });

  it("denies agent ui_role without owner role", () => {
    expect(isCeoCommandOwner({ ui_role: "agent", role: "agent" })).toBe(false);
    expect(isCeoCommandOwner({ ui_role: "agent_team" })).toBe(false);
    expect(isCeoCommandOwner(null)).toBe(false);
  });
});

describe("[verification] CEO Command notifications render source", () => {
  beforeEach(() => {
    eqMock.mockReturnThis();
    orderMock.mockReturnValue({ limit: limitMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockImplementation(() => ({
      eq: eqMock,
      order: orderMock,
    }));
    limitMock.mockResolvedValue({ data: SEED_NOTIFICATIONS, error: null });
  });

  it("loads ceo_command rows from routine_notifications", async () => {
    const rows = await getCeoCommandNotifications("agency-1");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.type === "ceo_command")).toBe(true);
    expect(rows[0]?.title).toContain("Týždenný výkon");
    expect(rows[0]?.read_at).toBeNull();
    expect(rows[1]?.read_at).not.toBeNull();
  });

  it("filters by agency and type ceo_command", async () => {
    await getCeoCommandNotifications("agency-1", 10);
    expect(selectMock).toHaveBeenCalledWith("*");
    expect(eqMock).toHaveBeenCalledWith("agency_id", "agency-1");
    expect(eqMock).toHaveBeenCalledWith("type", "ceo_command");
    expect(limitMock).toHaveBeenCalledWith(10);
  });
});
