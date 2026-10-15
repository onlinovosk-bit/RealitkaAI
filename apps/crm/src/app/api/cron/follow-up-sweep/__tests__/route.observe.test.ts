// ================================================================
// FOLLOWUP-CRON-OBSERVE-01 — beh sweepu musí po sebe nechať stopu.
//
// Zmerané na PROD 2026-10-15: 522 z 523 leadov spĺňa všetky podmienky
// spôsobilosti, a pritom `ai_followup_count > 0` má nula leadov a návrhov od
// tohto agenta je nula. Či cron vôbec bežal, sa nedalo zistiť — runtime logy
// Vercelu na Hobby pláne držia ~1 hodinu a sweep beží o 22:00.
//
// Tieto testy držia, že každá cesta von z routy zapíše riadok do `cron_runs`,
// lebo bez neho je „nebežalo to" nerozlíšiteľné od „bežalo a nič nenašlo".
// ================================================================
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  leads: [] as Record<string, unknown>[],
  leadsError: null as string | null,
  plans: [] as Record<string, unknown>[],
  insertOk: true,
  recordCronRun: vi.fn(),
  recordUnauthorizedCronRun: vi.fn(),
}));

/** Chainable double: každá metóda vracia seba, await vráti nakonfigurovaný výsledok. */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "in", "lt", "order", "limit", "eq", "update", "insert"]) {
    b[m] = () => b;
  }
  b.maybeSingle = async () => ({ data: { ai_followup_count: 0 }, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () =>
      builder(
        mocks.leadsError
          ? { data: null, error: { message: mocks.leadsError } }
          : { data: mocks.leads, error: null },
      ),
  }),
}));

vi.mock("@/lib/ai/open-followup-generator", () => ({
  FOLLOWUP_PROMPT_VERSION: "test-v1",
  generateOpenFollowUpsBatch: async () => mocks.plans,
}));

vi.mock("@/lib/inbound/insert-agent-draft", () => ({
  insertAgentDraft: async () =>
    mocks.insertOk
      ? { ok: true, correlationId: "c", activityId: "a" }
      : { ok: false, error: "insert zlyhal" },
  recipientFor: () => "klient@example.sk",
}));

vi.mock("@/lib/ops/cron-run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ops/cron-run")>();
  return {
    ...actual,
    recordCronRun: mocks.recordCronRun,
    recordUnauthorizedCronRun: mocks.recordUnauthorizedCronRun,
  };
});

import { GET } from "../route";

const SECRET = "test-cron-secret";

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/follow-up-sweep", {
    headers: { authorization: `Bearer ${SECRET}`, ...headers },
    // NextRequest je v týchto testoch zastúpený Request-om; route číta iba hlavičky.
  }) as unknown as Parameters<typeof GET>[0];
}

/** Lead, ktorý prejde všetkými podmienkami spôsobilosti. */
const sposobily = (id: string) => ({
  id,
  agency_id: "ag-1",
  name: "Test",
  email: "t@example.sk",
  phone: "",
  status: "Nový",
  budget: "",
  location: "",
  last_contact: null,
  note: "",
  score: 50,
  updated_at: "2026-01-01T00:00:00Z",
  last_ai_followup_at: null,
  ai_followup_count: 0,
  ai_priority: "high",
});

const plan = (leadId: string) => ({
  lead_id: leadId,
  should_contact: true,
  message: "Dobrý deň, ozývam sa k vášmu dopytu.",
  subject: "Follow-up",
  channel: "email",
  reason_sk: "5 dní bez reakcie",
  broker_cc_needed: false,
});

/** Posledný zápis do cron_runs. */
const zapis = () =>
  mocks.recordCronRun.mock.calls.at(-1)?.[1] as
    | { status: string; scanned?: number; eligible?: number; written?: number; failed?: number }
    | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mocks.leads = [];
  mocks.leadsError = null;
  mocks.plans = [];
  mocks.insertOk = true;
  mocks.recordCronRun.mockResolvedValue(null);
  mocks.recordUnauthorizedCronRun.mockResolvedValue(true);
});

describe("odmietnutý beh nechá stopu, keď prišiel ako cron", () => {
  it("zlý secret s cron hlavičkou → zapíše sa neoprávnený beh", async () => {
    const res = await GET(
      req({ authorization: "Bearer zle", "x-vercel-cron-schedule": "0 22 * * *" }),
    );
    expect(res.status).toBe(401);
    expect(mocks.recordUnauthorizedCronRun).toHaveBeenCalled();
  });

  it("zlý secret BEZ cron hlavičky → nezapisuje sa nič", async () => {
    const res = await GET(req({ authorization: "Bearer zle" }));
    expect(res.status).toBe(401);
    expect(mocks.recordUnauthorizedCronRun).not.toHaveBeenCalled();
    expect(mocks.recordCronRun).not.toHaveBeenCalled();
  });
});

describe("každá cesta von zapíše riadok", () => {
  it("žiadni kandidáti → status empty, nie ticho", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()?.status).toBe("empty");
    expect(zapis()?.eligible).toBe(0);
  });

  it("chyba dotazu na leady → status failed s prvou chybou", async () => {
    mocks.leadsError = "spojenie zlyhalo";
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(zapis()?.status).toBe("failed");
    expect(mocks.recordCronRun.mock.calls.at(-1)?.[1].firstError).toContain("spojenie zlyhalo");
  });

  it("úspešný beh → status ok s počtom zapísaných", async () => {
    mocks.leads = [sposobily("l1"), sposobily("l2")];
    mocks.plans = [plan("l1"), plan("l2")];
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(zapis()).toMatchObject({ status: "ok", eligible: 2, written: 2, failed: 0 });
  });

  it("kandidáti sú, ale nič sa nezapísalo → failed, nie empty", async () => {
    // Toto je presne ten stav, čo na PROD nastal 14 nocí po sebe a nebolo ho
    // z čoho prečítať: 522 spôsobilých, 0 návrhov.
    mocks.leads = [sposobily("l1")];
    mocks.plans = [plan("l1")];
    mocks.insertOk = false;
    await GET(req());
    expect(zapis()).toMatchObject({ status: "failed", eligible: 1, written: 0, failed: 1 });
  });

  it("model povie nekontaktovat → beh sa nehlasi ako zlyhanie dat", async () => {
    mocks.leads = [sposobily("l1")];
    mocks.plans = [{ ...plan("l1"), should_contact: false }];
    await GET(req());
    // Kandidát bol, návrh nevznikol zámerne — `failed` je správne, lebo
    // written = 0; detail nesie `planned`, aby sa to dalo odlíšiť od chyby.
    expect(zapis()?.status).toBe("failed");
    expect(mocks.recordCronRun.mock.calls.at(-1)?.[1].detail).toMatchObject({ planned: 1 });
  });
});
