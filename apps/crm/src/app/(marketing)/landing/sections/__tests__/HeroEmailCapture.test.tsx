/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HeroEmailCapture } from "../HeroEmailCapture";

const PUBLIC_CAPTURE = "/api/demo/public-capture";

beforeEach(() => {
  const original = window.setTimeout.bind(window);
  vi.spyOn(window, "setTimeout").mockImplementation(((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
    if (ms === 900) return 0 as unknown as ReturnType<typeof setTimeout>;
    return original(fn, ms, ...args);
  }) as typeof window.setTimeout);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true, duplicate: false }), { status: 200 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function typeEmail(value: string) {
  fireEvent.change(screen.getByLabelText("Váš pracovný email"), { target: { value } });
}

describe("HeroEmailCapture", () => {
  it("neplatný email nevolá server", () => {
    render(<HeroEmailCapture />);
    typeEmail("nie");
    fireEvent.click(screen.getByRole("button", { name: "Začať →" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Zadajte platný emailový tvar.");
  });

  it("platný email ide na public-capture bez kľúča", async () => {
    render(<HeroEmailCapture />);
    typeEmail("a@b.sk");
    fireEvent.click(screen.getByRole("button", { name: "Začať →" }));

    expect(await screen.findByText("Skvelé! Presmerovávam vás...")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(PUBLIC_CAPTURE);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      email: "a@b.sk",
      source: "hero_email_capture",
      gdprConsent: true,
      website: "",
    });
    expect(JSON.stringify(init.headers)).not.toContain("x-api-key");
  });

  it("vyplnený honeypot website ide v tele", async () => {
    render(<HeroEmailCapture />);
    typeEmail("a@b.sk");
    const trap = document.querySelector('input[name="website"]') as HTMLInputElement;
    fireEvent.change(trap, { target: { value: "bot" } });
    fireEvent.click(screen.getByRole("button", { name: "Začať →" }));

    expect(await screen.findByText("Skvelé! Presmerovávam vás...")).toBeInTheDocument();
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).website).toBe("bot");
  });
});
