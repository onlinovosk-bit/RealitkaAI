/**
 * MORNING-BRIEF-UI-01 — nastavenia ranného prehľadu.
 *
 * Na PROD mala `morning_brief_settings` 2026-10-15 nula riadkov, takže cron
 * bežal 14 dní zo 14 a zakaždým skončil na `enabled_rows: 0`. Táto route je
 * jediné miesto, kde taký riadok vznikne, a píše sa cez session klienta —
 * preto sa tu testuje aj to, že `profile_id` nemôže prísť z tela.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  settingsMaybeSingle: vi.fn(),
  upsert: vi.fn(),
  upsertSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.profileMaybeSingle }),
          }),
        };
      }
      // morning_brief_settings
      return {
        select: () => ({
          eq: () => ({ maybeSingle: mocks.settingsMaybeSingle }),
        }),
        upsert: (...args: unknown[]) => {
          mocks.upsert(...args);
          return { select: () => ({ single: mocks.upsertSingle }) };
        },
      };
    },
  }),
}));

import { GET, PUT } from "../route";

const PROFILE = "11111111-1111-4111-8111-111111111111";
const CUDZI = "22222222-2222-4222-8222-222222222222";

const ROW = {
  enabled: true,
  delivery_hour_utc: 6,
  delivery_minute_utc: 0,
  lead_count: 3,
  include_lv_changes: true,
  include_arbitrage: true,
  include_price_drops: true,
  include_team_stats: false,
  channels: ["email"],
  a_b_variant: "A",
};

const BODY = {
  enabled: true,
  deliveryHourUtc: 6,
  deliveryMinuteUtc: 0,
  leadCount: 3,
  includeLvChanges: true,
  includeArbitrage: true,
  includePriceDrops: true,
  includeTeamStats: false,
  channels: ["email"],
  abVariant: "A",
};

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/morning-brief/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-1" } } });
  mocks.profileMaybeSingle.mockResolvedValue({ data: { id: PROFILE }, error: null });
  mocks.settingsMaybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.upsertSingle.mockResolvedValue({ data: ROW, error: null });
});

describe("kto nie je prihlásený, nenastaví nič", () => {
  it("GET bez používateľa → 401", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET()).status).toBe(401);
  });

  it("PUT bez používateľa → 401 a nič sa nezapíše", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await put(BODY)).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});

describe("profil sa berie z prihlásenia, nie z tela", () => {
  it("profile_id v tele sa ignoruje", async () => {
    const res = await put({ ...BODY, profile_id: CUDZI, profileId: CUDZI });
    expect(res.status).toBe(200);
    const row = mocks.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(row.profile_id).toBe(PROFILE);
    expect(JSON.stringify(row)).not.toContain(CUDZI);
  });
});

describe("hranice sú tie isté ako CHECK v migrácii", () => {
  const zle: Array<[string, Record<string, unknown>]> = [
    ["hodina 24", { deliveryHourUtc: 24 }],
    ["hodina -1", { deliveryHourUtc: -1 }],
    ["minúta 60", { deliveryMinuteUtc: 60 }],
    ["počet leadov 0", { leadCount: 0 }],
    ["počet leadov 11", { leadCount: 11 }],
    ["neznámy variant", { abVariant: "C" }],
    ["prázdne kanály", { channels: [] }],
    ["nedoručiteľný kanál", { channels: ["whatsapp"] }],
    ["hodina ako text", { deliveryHourUtc: "6" }],
  ];

  for (const [nazov, patch] of zle) {
    it(`${nazov} → 400 a žiadny zápis`, async () => {
      const res = await put({ ...BODY, ...patch });
      expect(res.status).toBe(400);
      expect(mocks.upsert).not.toHaveBeenCalled();
    });
  }

  it("platné telo prejde a vráti uložený stav", async () => {
    const res = await put(BODY);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; settings: { leadCount: number } };
    expect(json.ok).toBe(true);
    expect(json.settings.leadCount).toBe(3);
  });
});

describe("nenastavené nie je to isté ako vypnuté", () => {
  it("GET bez riadku vráti settings: null", async () => {
    const res = await GET();
    const json = (await res.json()) as { settings: unknown };
    expect(json.settings).toBeNull();
  });

  it("GET s riadkom vráti hodnoty v tvare pre UI", async () => {
    mocks.settingsMaybeSingle.mockResolvedValue({
      data: { ...ROW, enabled: false, lead_count: 7 },
      error: null,
    });
    const res = await GET();
    const json = (await res.json()) as {
      settings: { enabled: boolean; leadCount: number };
    };
    expect(json.settings.enabled).toBe(false);
    expect(json.settings.leadCount).toBe(7);
  });
});
