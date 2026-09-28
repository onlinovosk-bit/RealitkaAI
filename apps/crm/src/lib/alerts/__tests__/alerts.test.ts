import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { escapeHtml, formatSlack, formatTelegram } from "../format";
import { channelsFor, isDuplicate, markSent, minSeverity, resetDedup } from "../policy";
import { routeAlert } from "../router";
import { isTelegramConfigured, sendTelegram } from "../telegram";
import type { AlertEvent } from "../types";

const CONFIGURED = {
  SLACK_WEBHOOK_URL: "https://hooks.example.test/x",
  TELEGRAM_BOT_TOKEN: "12345:secret-token",
  TELEGRAM_CHAT_ID: "-100999",
} as unknown as NodeJS.ProcessEnv;

function event(overrides: Partial<AlertEvent> = {}): AlertEvent {
  return {
    type: "CI_FAILURE",
    severity: "CRITICAL",
    title: "main CI FAILED",
    agent: "executor",
    dedupKey: "ci:main",
    ...overrides,
  };
}

beforeEach(() => {
  resetDedup();
  vi.restoreAllMocks();
});

afterEach(() => {
  resetDedup();
});

describe("policy", () => {
  it("drží INFO a EVENT ticho, kým ich founder nezapne", () => {
    expect(channelsFor(event({ severity: "INFO" }), CONFIGURED)).toEqual([]);
    expect(channelsFor(event({ severity: "EVENT" }), CONFIGURED)).toEqual([]);
  });

  it("posiela WARNING a vyššie aj do Telegramu", () => {
    for (const severity of ["WARNING", "CRITICAL", "GOVERNANCE"] as const) {
      expect(channelsFor(event({ severity }), CONFIGURED)).toContain("telegram");
    }
  });

  it("rešpektuje ALERTS_MIN_SEVERITY", () => {
    const env = { ...CONFIGURED, ALERTS_MIN_SEVERITY: "INFO" } as NodeJS.ProcessEnv;
    expect(minSeverity(env)).toBe("INFO");
    expect(channelsFor(event({ severity: "INFO" }), env)).toEqual(["slack"]);
  });

  it("padá späť na WARNING pri nezmyselnej hodnote", () => {
    const bogus = { ALERTS_MIN_SEVERITY: "nonsense" } as unknown as NodeJS.ProcessEnv;
    expect(minSeverity(bogus)).toBe("WARNING");
  });
});

describe("dedup", () => {
  it("potlačí ten istý incident v tichom intervale", () => {
    const e = event();
    const t0 = 1_000_000;
    expect(isDuplicate(e, t0)).toBe(false);
    markSent(e, t0);
    expect(isDuplicate(e, t0 + 60_000)).toBe(true);
  });

  it("pustí ten istý incident po uplynutí intervalu", () => {
    const e = event();
    const t0 = 1_000_000;
    markSent(e, t0);
    // CRITICAL má tiché okno 10 minút.
    expect(isDuplicate(e, t0 + 11 * 60_000)).toBe(false);
  });

  it("nikdy nepotlačí správu o vyriešení a zavrie tým incident", () => {
    const t0 = 1_000_000;
    markSent(event(), t0);
    const resolved = event({ resolved: true });
    expect(isDuplicate(resolved, t0 + 1_000)).toBe(false);
    markSent(resolved, t0 + 1_000);
    // Po vyriešení musí ďalší výskyt incidentu zase prejsť.
    expect(isDuplicate(event(), t0 + 2_000)).toBe(false);
  });

  it("drží incidenty oddelene podľa dedupKey", () => {
    const t0 = 1_000_000;
    markSent(event({ dedupKey: "ci:main" }), t0);
    expect(isDuplicate(event({ dedupKey: "ci:pr-566" }), t0)).toBe(false);
  });
});

describe("format", () => {
  it("escapuje HTML, takže obsah poľa nemôže rozbiť správu", () => {
    expect(escapeHtml('<b>x</b> & "y"')).toBe('&lt;b&gt;x&lt;/b&gt; &amp; "y"');
    const text = formatTelegram(event({ fields: { commit: "<script>bad</script>" } }));
    expect(text).toContain("&lt;script&gt;");
    expect(text).not.toContain("<script>");
  });

  it("skladá správu z polí a nepreberá hotový text", () => {
    const text = formatSlack(
      event({ fields: { PR: "#566", check: "Lint, test, build" }, evidenceRef: "docs/x.md" }),
    );
    expect(text).toContain("🔴 CRITICAL");
    expect(text).toContain("PR: #566");
    expect(text).toContain("dôkaz: docs/x.md");
  });

  it("označí vyriešený incident a vtedy nepýta zásah", () => {
    const text = formatSlack(event({ resolved: true, actionRequired: true }));
    expect(text).toContain("VYRIEŠENÉ");
    expect(text).not.toContain("vyžaduje zásah");
  });

  it("zráža viacriadkovú hodnotu na jeden riadok", () => {
    const text = formatSlack(event({ fields: { log: "riadok1\nriadok2" } }));
    expect(text).toContain("log: riadok1 riadok2");
  });

  it("nepresiahne limit Telegramu ani pri dlhom vstupe", () => {
    const text = formatTelegram(event({ title: "x".repeat(9000) }));
    expect(text.length).toBeLessThanOrEqual(4096);
  });
});

describe("telegram", () => {
  it("bez tokenu neposiela a nehádže", async () => {
    expect(isTelegramConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    await expect(sendTelegram(event(), {} as NodeJS.ProcessEnv)).resolves.toEqual({
      channel: "telegram",
      delivered: false,
      reason: "not_configured",
    });
  });

  it("volá Bot API s chat_id a nevkladá token do tela", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await sendTelegram(event(), CONFIGURED);

    expect(result.delivered).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot12345:secret-token/sendMessage");
    expect(String(init.body)).toContain("-100999");
    expect(String(init.body)).not.toContain("secret-token");
  });

  it("chybu siete prevedie na výsledok, nie na výnimku", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    await expect(sendTelegram(event(), CONFIGURED)).resolves.toMatchObject({ delivered: false });
  });
});

describe("router", () => {
  it("potlačí event pod prahom a nevolá žiadny kanál", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await routeAlert(event({ severity: "INFO" }), CONFIGURED);
    expect(result).toMatchObject({ routed: false, suppressedBy: "policy" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doručí CRITICAL do oboch kanálov naraz", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const result = await routeAlert(event(), CONFIGURED);

    expect(result.routed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.deliveries.every((d) => d.delivered)).toBe(true);
  });

  it("druhý rovnaký incident potlačí dedupom", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await routeAlert(event(), CONFIGURED);
    const second = await routeAlert(event(), CONFIGURED);
    expect(second).toMatchObject({ routed: false, suppressedBy: "dedup" });
  });

  it("neumlčí incident, keď sa doručenie nepodarilo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));

    const first = await routeAlert(event(), CONFIGURED);
    expect(first.deliveries.every((d) => !d.delivered)).toBe(true);

    // Dedup sa nesmie otvoriť — inak by zlyhanie siete incident nadobro umlčalo.
    const second = await routeAlert(event(), CONFIGURED);
    expect(second.routed).toBe(true);
  });

  it("nezhodí volajúceho, keď kanál vyhodí výnimku", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(routeAlert(event(), CONFIGURED)).resolves.toMatchObject({ routed: true });
  });

  it("doručí aj cez jediný nakonfigurovaný kanál", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const onlyTelegram = {
      TELEGRAM_BOT_TOKEN: "t:1",
      TELEGRAM_CHAT_ID: "-1",
    } as unknown as NodeJS.ProcessEnv;

    const result = await routeAlert(event(), onlyTelegram);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.deliveries.find((d) => d.channel === "slack")?.reason).toBe("not_configured");
    expect(result.deliveries.find((d) => d.channel === "telegram")?.delivered).toBe(true);
  });
});
