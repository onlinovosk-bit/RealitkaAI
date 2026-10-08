/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildPricingV2Catalog } from "@/lib/pricing-v2";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";
import PricingV2Plans from "../PricingV2Plans";
import PricingV2CreditsTopup from "../PricingV2CreditsTopup";
import PricingV2Comparison from "../PricingV2Comparison";
import ProgramComparisonSwitch from "../ProgramComparisonSwitch";
import ProgramComparison from "@/components/billing/ProgramComparison";
import CreditsTopupPanel from "@/components/billing/CreditsTopupPanel";
import UpgradePage from "@/app/(dashboard)/upgrade/page";
import { readPricingV2Config } from "../usePricingV2Config";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function v2Config(over: Partial<PricingV2ConfigPayload> = {}): PricingV2ConfigPayload {
  return { enabled: true, checkoutAvailable: true, missingPriceEnvKeys: [], catalog: buildPricingV2Catalog(), ...over };
}

type Json = Record<string, unknown>;
function jsonRes(status: number, body: Json) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

const LEGACY_CONFIG = {
  ok: true,
  seatCheckoutAvailable: true,
  topupCheckoutAvailable: true,
  checkoutAvailable: true,
  founderCockpitEligible: false,
  founderCockpitRemaining: 0,
  seatTiers: [
    { key: "solo", label: "Solo", priceEur: 79, minSeats: 1, defaultSeats: 1, monthlyGrantPerSeat: 20 },
    { key: "team", label: "Team", priceEur: 71, minSeats: 2, defaultSeats: 3, monthlyGrantPerSeat: 25 },
    { key: "office", label: "Office", priceEur: 63, minSeats: 5, defaultSeats: 5, monthlyGrantPerSeat: 30 },
  ],
  cockpit: { liteMinSeats: 3, ownerPurchasable: true, ownerPriceEur: 349, ownerFounderPriceEur: 249 },
  topupPackages: [{ key: "start", label: "Start", credits: 100, priceEur: 47 }],
};

/** Mock fetch podľa URL; checkout odpoveď sa mení per test. */
function mockFetch(opts: { configBody?: Json | "fail"; checkout?: Response }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === "/api/billing/checkout-config") {
      if (opts.configBody === "fail") throw new Error("offline");
      return jsonRes(200, opts.configBody ?? LEGACY_CONFIG);
    }
    if (url === "/api/billing/plan") return jsonRes(200, { ok: true, creditsBalance: 5, grantBalance: 5, purchasedBalance: 0, monthlyGrantCredits: 25 });
    if (url === "/api/billing/credits/checkout") return opts.checkout ?? jsonRes(200, { ok: true, result: { id: "cs_1", url: "https://stripe.test/pay" } });
    return jsonRes(404, {});
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls, checkoutCalls: () => calls.filter((c) => c.url === "/api/billing/credits/checkout") };
}

async function setUsers(value: string) {
  const input = screen.getByLabelText("Počet používateľov") as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PricingV2Plans — pásmo a ceny z katalógu", () => {
  // [počet, pásmo, čistá, konečná s 23 % DPH]
  const CASES: Array<[string, string, string, string]> = [
    ["1", "start", "25,00 €", "30,75 €"],
    ["2", "team", "60,00 €", "73,80 €"],
    ["6", "team", "60,00 €", "73,80 €"],
    ["7", "office", "149,00 €", "183,27 €"],
    ["25", "office", "149,00 €", "183,27 €"],
    ["26", "network", "349,00 €", "429,27 €"],
  ];

  it.each(CASES)("%s používateľov -> pásmo %s, čistá %s, konečná %s", async (n, band, net, gross) => {
    render(<PricingV2Plans config={v2Config()} />);
    await setUsers(n);
    for (const id of ["start", "team", "office", "network"]) {
      expect(screen.getByTestId(`band-${id}`).getAttribute("data-selected")).toBe(id === band ? "true" : "false");
    }
    expect(screen.getByTestId("selected-net").textContent).toBe(net);
    expect(screen.getByTestId("selected-gross").textContent).toBe(gross);
  });

  it("zobrazí všetky 4 pásma s čistou aj konečnou cenou a poznámku o DPH", () => {
    render(<PricingV2Plans config={v2Config()} />);
    expect(screen.getByTestId("band-start-net").textContent).toBe("25,00 €");
    expect(screen.getByTestId("band-start-gross").textContent).toBe("30,75 €");
    expect(screen.getByTestId("band-team-gross").textContent).toBe("73,80 €");
    expect(screen.getByTestId("band-office-net").textContent).toBe("149,00 €");
    expect(screen.getByTestId("band-network-net").textContent).toBe("od 349,00 €");
    expect(screen.getByTestId("band-network-gross").textContent).toBe("od 429,27 €");
    expect(screen.getByTestId("vat-note").textContent).toMatch(/mesačné.*bez DPH.*23 % DPH/);
  });

  it("každá karta pásma ukáže zoznam funkcií plánu", () => {
    render(<PricingV2Plans config={v2Config()} />);
    expect(screen.getByTestId("band-start-features").textContent).toContain("Denný briefing priorít");
    expect(screen.getByTestId("band-team-features").textContent).toContain("Všetko zo Start");
    expect(screen.getByTestId("band-office-features").textContent).toContain("Prioritná podpora");
    expect(screen.getByTestId("band-network-features").textContent).toContain("Všetko z Kancelárie");
  });

  it("neplatný počet (0, prázdny, desatinný) nevyberie pásmo a CTA je zablokované", async () => {
    const { fn } = mockFetch({});
    render(<PricingV2Plans config={v2Config()} />);
    for (const v of ["0", "", "2.5", "-3"]) {
      await setUsers(v);
      expect(screen.queryByTestId("selected-net")).toBeNull();
      expect((screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it("v2 ponuka neobsahuje Owner Cockpit ani seat texty", () => {
    const { container } = render(<PricingV2Plans config={v2Config()} />);
    expect(container.textContent).not.toMatch(/Owner Cockpit|seat/i);
  });

  it("výber balíka ukáže jeho čistú aj konečnú cenu z katalógu", async () => {
    render(<PricingV2Plans config={v2Config()} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Mesačný balík kreditov"), "120");
    expect(screen.getByTestId("selected-pack").textContent).toContain("62,00 €");
    expect(screen.getByTestId("selected-pack").textContent).toContain("76,26 €");
  });
});

describe("PricingV2Plans — CTA a chyby checkoutu", () => {
  it("POST s telom podľa kontraktu a presmerovanie na url", async () => {
    const { checkoutCalls } = mockFetch({});
    const navigate = vi.fn();
    render(<PricingV2Plans config={v2Config()} navigate={navigate} />);
    await setUsers("7");
    await userEvent.setup().selectOptions(screen.getByLabelText("Mesačný balík kreditov"), "120");
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://stripe.test/pay"));
    const [call] = checkoutCalls();
    expect(call.init?.method).toBe("POST");
    expect(JSON.parse(String(call.init?.body))).toEqual({ checkoutType: "pricing_v2", users: 7, packCredits: 120, interval: "month" });
  });

  it("bez balíka pošle packCredits: null", async () => {
    const { checkoutCalls } = mockFetch({});
    render(<PricingV2Plans config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({ checkoutType: "pricing_v2", users: 1, packCredits: null, interval: "month" });
  });

  const ERRORS: Array<[string, number, Json, RegExp]> = [
    ["404 pricing_v2_disabled", 404, { ok: false, error: "x", code: "pricing_v2_disabled" }, /Nový cenník zatiaľ nie je zapnutý/],
    ["409 legacy_subscription", 409, { ok: false, error: "x", code: "legacy_subscription" }, /Predplatné máte dohodnuté.*kontaktujte/],
    ["400 invalid_request", 400, { ok: false, error: "x", code: "invalid_request" }, /Skontrolujte počet používateľov/],
    ["503 prices_not_configured", 503, { ok: false, error: "x", code: "prices_not_configured", missing: ["STRIPE_PRICE_V2_TEAM"] }, /Objednávka nie je zatiaľ dostupná/],
  ];

  it.each(ERRORS)("%s -> zrozumiteľná správa, bez presmerovania, stránka žije", async (_n, status, body, re) => {
    mockFetch({ checkout: jsonRes(status, body) });
    const navigate = vi.fn();
    render(<PricingV2Plans config={v2Config()} navigate={navigate} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(re);
    expect(navigate).not.toHaveBeenCalled();
    // po chybe sa dá znova skúsiť a ceny ostávajú
    expect((screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("band-team-gross").textContent).toBe("73,80 €");
  });

  it("503 bez code (iba status) sa tiež ukáže ako nedostupné; sieťová chyba je zrozumiteľná", async () => {
    mockFetch({ checkout: jsonRes(503, { ok: false, error: "x" }) });
    render(<PricingV2Plans config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Objednávka nie je zatiaľ dostupná/);
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<PricingV2Plans config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Nepodarilo sa spustiť objednávku/);
  });

  it("checkoutAvailable=false: ukáže „nie je dostupná“, CTA je zablokované a nič sa nevolá", async () => {
    const { fn } = mockFetch({});
    render(<PricingV2Plans config={v2Config({ checkoutAvailable: false, missingPriceEnvKeys: ["STRIPE_PRICE_V2_TEAM"] })} navigate={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toMatch(/Objednávka nie je zatiaľ dostupná/);
    const btn = screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await userEvent.setup().click(btn);
    expect(fn).not.toHaveBeenCalled();
    // názvy env sa používateľovi neukazujú
    expect(document.body.textContent).not.toContain("STRIPE_PRICE");
  });
});

describe("ročné platenie — UI", () => {
  const yearlyConfig = () => v2Config({ yearlyAvailable: true });

  it("bez ročných cien sa prepínač nezobrazí a nákup ostáva mesačný", () => {
    render(<PricingV2Plans config={v2Config()} />);
    expect(screen.queryByTestId("interval-year")).toBeNull();
    expect(screen.getByTestId("band-team-net").textContent).toBe("60,00 €");
  });

  it("s ročnými cenami: prepínač Ročne ukáže ročnú čistú aj konečnú cenu (12 × mesačná, bez zľavy)", async () => {
    render(<PricingV2Plans config={yearlyConfig()} />);
    await userEvent.setup().click(screen.getByTestId("interval-year"));
    expect(screen.getByTestId("band-start-net").textContent).toBe("300,00 €");
    expect(screen.getByTestId("band-start-gross").textContent).toBe("369,00 €");
    expect(screen.getByTestId("band-team-net").textContent).toBe("720,00 €");
    expect(screen.getByTestId("band-office-net").textContent).toBe("1788,00 €");
    expect(screen.getByTestId("band-network-net").textContent).toBe("od 4188,00 €");
    expect(screen.getByTestId("yearly-note").textContent).toContain("bez zľavy");
    expect(screen.getByTestId("selected-net").textContent).toBe("300,00 €");
  });

  it("ročný nákup pošle interval year bez balíka kreditov", async () => {
    const { checkoutCalls } = mockFetch({});
    render(<PricingV2Plans config={yearlyConfig()} navigate={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("interval-year"));
    await user.click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({
      checkoutType: "pricing_v2",
      users: 1,
      packCredits: null,
      interval: "year",
    });
  });

  it("výber balíka sa pri ročnom platení skryje a nepošle sa", async () => {
    render(<PricingV2Plans config={v2Config({ yearlyAvailable: true, plansOnly: false })} />);
    expect(screen.getByLabelText("Mesačný balík kreditov")).toBeTruthy();
    await userEvent.setup().click(screen.getByTestId("interval-year"));
    expect(screen.queryByLabelText("Mesačný balík kreditov")).toBeNull();
  });

  it("porovnanie ukazuje ročnú cenu každého pásma", () => {
    render(<PricingV2Comparison config={v2Config()} />);
    expect(screen.getByTestId("compare-team-annual").textContent).toContain("720,00 €");
    expect(screen.getByTestId("compare-team-annual").textContent).toContain("885,60 €");
  });
});

describe("režim „len plány“ — UI", () => {
  const plansOnly = () => v2Config({ plansOnly: true, catalog: { ...buildPricingV2Catalog(), packs: [] } });

  it("PricingV2Plans nezobrazí výber balíka", () => {
    render(<PricingV2Plans config={plansOnly()} />);
    expect(screen.queryByLabelText("Mesačný balík kreditov")).toBeNull();
    expect(screen.getByLabelText("Počet používateľov")).toBeTruthy();
  });

  it("PricingV2CreditsTopup sa nevykreslí vôbec", () => {
    render(<PricingV2CreditsTopup config={plansOnly()} />);
    expect(screen.queryByTestId("pricing-v2-credits")).toBeNull();
  });

  it("plán sa kúpi bez balíka (packCredits null)", async () => {
    const { checkoutCalls } = mockFetch({});
    render(<PricingV2Plans config={plansOnly()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať|Kúpiť|Objednať|Založiť/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body)).packCredits).toBeNull();
  });
});

describe("PricingV2CreditsTopup — jednorazové kredity", () => {
  it("cena z priceExtraCredits (čistá aj konečná) a telo pricing_v2_credits", async () => {
    const { checkoutCalls } = mockFetch({});
    const navigate = vi.fn();
    render(<PricingV2CreditsTopup config={v2Config()} navigate={navigate} />);
    expect(screen.getByTestId("credits-price").textContent).toContain("35,00 €");
    expect(screen.getByTestId("credits-price").textContent).toContain("43,05 €");
    fireEvent.change(screen.getByLabelText("Počet kreditov"), { target: { value: "100" } });
    expect(screen.getByTestId("credits-price").textContent).toContain("70,00 €");
    expect(screen.getByTestId("credits-price").textContent).toContain("86,10 €");
    await userEvent.setup().click(screen.getByRole("button", { name: "Dokúpiť kredity" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://stripe.test/pay"));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({ checkoutType: "pricing_v2_credits", credits: 100 });
  });

  it("409 a 503 ukáže správu; 0 kreditov blokuje CTA", async () => {
    mockFetch({ checkout: jsonRes(409, { ok: false, error: "x", code: "legacy_subscription" }) });
    render(<PricingV2CreditsTopup config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Dokúpiť kredity" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Predplatné máte dohodnuté/);
    cleanup();
    mockFetch({ checkout: jsonRes(503, { ok: false, error: "x", code: "prices_not_configured" }) });
    render(<PricingV2CreditsTopup config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Dokúpiť kredity" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Objednávka nie je zatiaľ dostupná/);
    cleanup();
    render(<PricingV2CreditsTopup config={v2Config()} />);
    fireEvent.change(screen.getByLabelText("Počet kreditov"), { target: { value: "0" } });
    expect((screen.getByRole("button", { name: "Dokúpiť kredity" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("readPricingV2Config — prepínač", () => {
  it("zapnuté len pri enabled === true s katalógom", () => {
    const cat = buildPricingV2Catalog();
    expect(readPricingV2Config({ pricingV2: { enabled: true, checkoutAvailable: true, missingPriceEnvKeys: [], catalog: cat } })).not.toBeNull();
    for (const bad of [
      undefined,
      {},
      { pricingV2: null },
      { pricingV2: { enabled: false, catalog: cat } },
      { pricingV2: { enabled: "true", catalog: cat } },
      { pricingV2: { enabled: 1, catalog: cat } },
      { pricingV2: { enabled: true, catalog: null } },
    ]) {
      expect(readPricingV2Config(bad)).toBeNull();
    }
  });
});

describe("Vypnutý prepínač — výstup nezmenený", () => {
  const OFF_VARIANTS: Array<[string, Json | "fail"]> = [
    ["bez poľa pricingV2", LEGACY_CONFIG],
    ["pricingV2.enabled=false", { ...LEGACY_CONFIG, pricingV2: { enabled: false, checkoutAvailable: false, missingPriceEnvKeys: [], catalog: null } }],
    ["pricingV2.enabled=false aj s katalógom", { ...LEGACY_CONFIG, pricingV2: { enabled: false, checkoutAvailable: true, missingPriceEnvKeys: [], catalog: buildPricingV2Catalog() } }],
    ["chyba načítania konfigurácie", "fail"],
  ];

  it.each(OFF_VARIANTS)("ProgramComparisonSwitch (%s) = bajt po bajte ProgramComparison", async (_n, configBody) => {
    mockFetch({ configBody });
    const direct = render(<ProgramComparison />).container.innerHTML;
    cleanup();
    mockFetch({ configBody });
    const { container } = render(<ProgramComparisonSwitch />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe(direct);
    expect(container.textContent).toContain("449");
    expect(container.textContent).not.toContain("Jedna mesačná cena");
  });

  it("Upgrade stránka: vypnuté variácie dávajú rovnaké HTML ako legacy a ukazujú seat ceny + Owner Cockpit", async () => {
    const html: string[] = [];
    for (const [, body] of OFF_VARIANTS.slice(0, 3)) {
      mockFetch({ configBody: body });
      const { container } = render(<UpgradePage />);
      await screen.findByText("Seat program");
      html.push(container.innerHTML);
      cleanup();
    }
    expect(html[1]).toBe(html[0]);
    expect(html[2]).toBe(html[0]);
    expect(html[0]).toContain("Owner Cockpit");
    expect(html[0]).toContain("79 €");
    expect(html[0]).toContain("Pokračovať do Stripe");
    expect(html[0]).toContain("Seat-based predplatné, Owner Cockpit a doplnkové kredity.");
    expect(html[0]).toContain("Top-up balíčky kreditov sú na stránke fakturácie");
  });

  it("Upgrade: legacy seat checkout posiela pôvodné telo", async () => {
    const { checkoutCalls } = mockFetch({ checkout: jsonRes(400, { ok: false, error: "Test" }) });
    render(<UpgradePage />);
    await userEvent.setup().click(await screen.findByRole("button", { name: /Pokračovať do Stripe/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toMatchObject({ checkoutType: "seat", seatTier: "team" });
  });

  it("CreditsTopupPanel: vypnuté v2 = rovnaké HTML ako bez poľa", async () => {
    const outputs: string[] = [];
    for (const [, body] of OFF_VARIANTS.slice(0, 2)) {
      mockFetch({ configBody: body });
      const { container } = render(<CreditsTopupPanel />);
      await screen.findByText(/Jednorazové balíčky kreditov/);
      await screen.findByText(/Kúpiť balík Start/);
      outputs.push(container.innerHTML);
      cleanup();
    }
    expect(outputs[1]).toBe(outputs[0]);
  });
});

describe("Zapnutý prepínač — obrazovky", () => {
  const ON_BODY = { ...LEGACY_CONFIG, pricingV2: { enabled: true, checkoutAvailable: true, missingPriceEnvKeys: [], catalog: buildPricingV2Catalog() } };

  it("ProgramComparisonSwitch ukáže pásma z katalógu a nie legacy hardcody", async () => {
    mockFetch({ configBody: ON_BODY });
    render(<ProgramComparisonSwitch />);
    expect(await screen.findByTestId("pricing-v2-comparison")).toBeTruthy();
    expect(screen.getByTestId("compare-team").textContent).toContain("60,00 €");
    expect(screen.getByTestId("compare-team").textContent).toContain("73,80 €");
    expect(document.body.textContent).not.toMatch(/PROTOCOL AUTHORITY|Owner Cockpit|449/);
  });

  it("Upgrade: v2 plán + jednorazové kredity, bez seat sekcie a Owner Cockpitu; CTA volá pricing_v2", async () => {
    const { checkoutCalls } = mockFetch({ configBody: ON_BODY });
    render(<UpgradePage />);
    expect(await screen.findByTestId("pricing-v2-plans")).toBeTruthy();
    expect(screen.getByTestId("pricing-v2-credits")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Owner Cockpit|Seat program|Pokračovať do Stripe/);
    await setUsers("26");
    expect(screen.getByTestId("selected-gross").textContent).toBe("429,27 €");
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({ checkoutType: "pricing_v2", users: 26, packCredits: null, interval: "month" });
  });

  it("Upgrade: zapnuté v2, ale ceny nenastavené -> „nie je dostupná“ (nie rozbitá stránka)", async () => {
    mockFetch({
      configBody: {
        ...LEGACY_CONFIG,
        seatCheckoutAvailable: false,
        topupCheckoutAvailable: false,
        checkoutAvailable: false,
        pricingV2: { enabled: true, checkoutAvailable: false, missingPriceEnvKeys: ["STRIPE_PRICE_V2_TEAM"], catalog: buildPricingV2Catalog() },
      },
    });
    render(<UpgradePage />);
    await screen.findByTestId("pricing-v2-plans");
    expect(screen.getAllByText(/Objednávka nie je zatiaľ dostupná/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/Checkout momentálne nedostupný/);
    expect((screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("CreditsTopupPanel: v2 nahradí legacy balíčky v2 dokúpením, zostatok ostáva", async () => {
    mockFetch({ configBody: ON_BODY });
    render(<CreditsTopupPanel />);
    expect(await screen.findByTestId("pricing-v2-credits")).toBeTruthy();
    expect(screen.getByText(/Kreditový zostatok: 5 kr/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Jednorazové balíčky kreditov|Kúpiť balík/);
  });
});
