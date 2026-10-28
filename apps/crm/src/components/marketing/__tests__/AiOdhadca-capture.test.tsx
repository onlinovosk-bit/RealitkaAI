/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AiOdhadca } from "../AcquisitionHub";

const ESTIMATE = "/api/demo/estimate";
const PUBLIC_CAPTURE = "/api/demo/public-capture";

const estimateBody = {
  address: "Sabinovská 12, Prešov",
  estimatedPrice: 150000,
  pricePerSqm: 2000,
  confidence: "high",
  trend: "rising",
  comparables: 4,
  generatedAt: "2026-10-20T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === ESTIMATE) {
        return new Response(JSON.stringify(estimateBody), { status: 200 });
      }
      if (url === PUBLIC_CAPTURE) {
        return new Response(JSON.stringify({ ok: true, duplicate: false }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function calculate() {
  render(<AiOdhadca />);
  fireEvent.click(screen.getByRole("button", { name: "VYPOČÍTAŤ TRHOVÚ CENU" }));
  expect(await screen.findByText("Email pre stiahnutie AI Reportu:")).toBeInTheDocument();
}

function captureCalls() {
  return vi.mocked(fetch).mock.calls.filter((call) => call[0] === PUBLIC_CAPTURE);
}

describe("AiOdhadca capture", () => {
  it("bez GDPR súhlasu nevolá public-capture", async () => {
    await calculate();
    fireEvent.change(screen.getByPlaceholderText("vas@email.sk"), { target: { value: "a@b.sk" } });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať report" }));

    expect(captureCalls()).toHaveLength(0);
    expect(screen.getByText(/Súhlas so spracovaním údajov je povinný/)).toBeInTheDocument();
  });

  it("neplatný email pri súhlase nevolá public-capture", async () => {
    await calculate();
    fireEvent.click(screen.getByText(/Súhlasím so spracovaním/));
    fireEvent.change(screen.getByPlaceholderText("vas@email.sk"), { target: { value: "nie" } });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať report" }));

    expect(captureCalls()).toHaveLength(0);
    expect(screen.getByText(/Zadajte platný email/)).toBeInTheDocument();
  });

  it("platný email a súhlas idú na public-capture bez kľúča", async () => {
    await calculate();
    fireEvent.click(screen.getByText(/Súhlasím so spracovaním/));
    fireEvent.change(screen.getByPlaceholderText("vas@email.sk"), { target: { value: "a@b.sk" } });
    fireEvent.click(screen.getByRole("button", { name: "Odoslať report" }));

    expect(await screen.findByText("Report odoslaný!")).toBeInTheDocument();
    expect(captureCalls()).toHaveLength(1);
    const [, init] = captureCalls()[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.stringify(init.headers)).not.toContain("x-api-key");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "a@b.sk",
      address: "Sabinovská 12, Prešov",
      source: "ai_odhadca",
      estimatedPrice: 150000,
      gdprConsent: true,
      website: "",
    });
  });
});
