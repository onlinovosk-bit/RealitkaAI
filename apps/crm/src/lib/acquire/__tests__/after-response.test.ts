import { beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.hoisted(() => vi.fn());
const captureMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  after: (cb: () => Promise<void>) => afterMock(cb),
}));

vi.mock("@/lib/auto-error-capture", () => ({
  autoErrorCapture: (...args: unknown[]) => captureMock(...args),
}));

import { runAfterResponse } from "@/lib/acquire/after-response";

/** Callback, ktorý runAfterResponse odovzdal `after()` — spustí sa až "po odpovedi". */
function scheduledTask(): () => Promise<void> {
  expect(afterMock).toHaveBeenCalledTimes(1);
  return afterMock.mock.calls[0][0] as () => Promise<void>;
}

describe("runAfterResponse — práca po odoslaní odpovede", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterMock.mockImplementation(() => undefined);
  });

  it("kroky sa len naplánujú cez after(); nespustia sa, kým callback nebeží", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    runAfterResponse("t", [{ name: "a", run }]);

    expect(run).not.toHaveBeenCalled();
    await scheduledTask()();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("kroky bežia po sebe: druhý začne až po dokončení prvého (auto-odpoveď číta ai_priority z triáže)", async () => {
    const udalosti: string[] = [];
    let dokonciPrvy!: () => void;
    const prvy = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          udalosti.push("prvy:start");
          dokonciPrvy = () => {
            udalosti.push("prvy:koniec");
            resolve();
          };
        }),
    );
    const druhy = vi.fn(async () => {
      udalosti.push("druhy:start");
    });

    runAfterResponse("t", [
      { name: "triage", run: prvy },
      { name: "auto_response", run: druhy },
    ]);
    const bezi = scheduledTask()();

    await vi.waitFor(() => expect(prvy).toHaveBeenCalledTimes(1));
    expect(druhy).not.toHaveBeenCalled();

    dokonciPrvy();
    await bezi;
    expect(udalosti).toEqual(["prvy:start", "prvy:koniec", "druhy:start"]);
  });

  it("pád kroku sa zachytí s kontextom a ďalší krok aj tak beží", async () => {
    const chyba = new Error("triage down");
    const druhy = vi.fn().mockResolvedValue(undefined);
    runAfterResponse("valuation-submit", [
      { name: "triage", run: () => Promise.reject(chyba) },
      { name: "auto_response", run: druhy },
    ]);

    await scheduledTask()();

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith(chyba, "after-response:valuation-submit:triage");
    expect(druhy).toHaveBeenCalledTimes(1);
  });

  it("synchrónny výnimka v kroku sa tiež zachytí a nepustí sa ďalej", async () => {
    const druhy = vi.fn().mockResolvedValue(undefined);
    runAfterResponse("t", [
      {
        name: "boom",
        run: () => {
          throw new Error("sync boom");
        },
      },
      { name: "druhy", run: druhy },
    ]);

    await expect(scheduledTask()()).resolves.toBeUndefined();
    expect(captureMock).toHaveBeenCalledWith(expect.any(Error), "after-response:t:boom");
    expect(druhy).toHaveBeenCalledTimes(1);
  });

  it("mimo requestu (after() hádže) kroky aj tak bežia a volajúcemu nič nehádže", async () => {
    afterMock.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope.");
    });
    const prvy = vi.fn().mockResolvedValue(undefined);
    const druhy = vi.fn().mockResolvedValue(undefined);

    expect(() =>
      runAfterResponse("t", [
        { name: "a", run: prvy },
        { name: "b", run: druhy },
      ]),
    ).not.toThrow();

    await vi.waitFor(() => {
      expect(prvy).toHaveBeenCalledTimes(1);
      expect(druhy).toHaveBeenCalledTimes(1);
    });
  });

  it("prázdny zoznam krokov nerobí nič a nehádže", async () => {
    runAfterResponse("t", []);
    await expect(scheduledTask()()).resolves.toBeUndefined();
    expect(captureMock).not.toHaveBeenCalled();
  });
});
