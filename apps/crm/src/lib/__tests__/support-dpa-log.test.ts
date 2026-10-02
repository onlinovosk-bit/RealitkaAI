import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ send: vi.fn(), dispatch: vi.fn() }));
vi.mock("@/lib/inbound-routing", () => ({
  sendInboundEmail: (...a: unknown[]) => m.send(...a),
  dispatchInboundTicket: (...a: unknown[]) => m.dispatch(...a),
}));

import { POST as support } from "@/app/api/support/request/route";
import { POST as dpa } from "@/app/api/legal/dpa-request/route";

const CUSTOMER = "zakaznik.kancelaria@firma.sk";
let err: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  err = vi.spyOn(console, "error").mockImplementation(() => undefined);
  m.send.mockRejectedValue(new Error(`Recipient rejected: <${CUSTOMER}> 550`));
  m.dispatch.mockRejectedValue(new Error(`Webhook echo: ${CUSTOMER}`));
});
afterEach(() => vi.restoreAllMocks());

// inspect, nie JSON.stringify: ten vlastnosti Error (message, stack) vôbec nevypíše a test by bol slepý.
const logged = () => inspect(err.mock.calls, { depth: 6 });
const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

describe("support a DPA žiadosť nelogujú adresu žiadateľa pri zlyhaní e-mailu ani webhooku", () => {
  it("POST /api/support/request", async () => {
    await support(req({ fullName: "Jan", email: CUSTOMER, company: "F", subject: "S", message: "M" }));
    expect(err).toHaveBeenCalled();
    expect(logged()).not.toContain(CUSTOMER);
  });

  it("POST /api/legal/dpa-request", async () => {
    await dpa(req({ fullName: "Jan", email: CUSTOMER, company: "F", country: "SK", notes: "n" }));
    expect(err).toHaveBeenCalled();
    expect(logged()).not.toContain(CUSTOMER);
  });
});
