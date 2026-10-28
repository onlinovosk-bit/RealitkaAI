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

/** Akcia 9/12 platí do 2026-12-31T22:59:59Z; testy si čas pripnú, aby nezáviseli od dnešného dátumu. */
const PROMO_NOW = new Date("2026-11-01T10:00:00Z");
const AFTER_PROMO = new Date("2027-01-15T10:00:00Z");

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
  const input = screen.getByLabelText("Počet maklérov") as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PricingV2Plans — pásmo a ceny (mesačná platba, +20 %)", () => {
  // [počet, pásmo, čistá mesačná (základ × 1,2), konečná s 23 % DPH] — nezávislý oracle zo spec §1
  const CASES: Array<[string, string, string, string]> = [
    ["1", "start", "30,00 €", "36,90 €"],
    ["2", "team", "60,00 €", "73,80 €"],
    ["3", "team", "78,00 €", "95,94 €"],
    ["5", "team", "78,00 €", "95,94 €"],
    ["6", "office", "88,80 €", "109,22 €"],
    ["10", "office", "132,00 €", "162,36 €"],
    ["11", "network", "139,20 €", "171,22 €"],
    ["50", "network", "346,00 €", "425,58 €"],
  ];

  it.each(CASES)("%s maklérov -> pásmo %s, čistá %s, konečná %s", async (n, band, net, gross) => {
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
    expect(screen.getByTestId("band-start-net").textContent).toBe("30,00 €");
    expect(screen.getByTestId("band-start-gross").textContent).toBe("36,90 €");
    expect(screen.getByTestId("band-team-gross").textContent).toBe("od 73,80 €");
    expect(screen.getByTestId("band-office-net").textContent).toBe("od 88,80 €");
    expect(screen.getByTestId("band-network-net").textContent).toBe("od 139,20 €");
    expect(screen.getByTestId("band-network-gross").textContent).toBe("od 171,22 €");
    expect(screen.getByTestId("vat-note").textContent).toMatch(/mesačné.*bez DPH.*23 % DPH/);
  });

  it("každá karta pásma ukáže zoznam funkcií plánu", () => {
    render(<PricingV2Plans config={v2Config()} />);
    expect(screen.getByTestId("band-start-features").textContent).toContain("Denný briefing priorít");
    expect(screen.getByTestId("band-team-features").textContent).toContain("Všetko zo Start");
    expect(screen.getByTestId("band-office-features").textContent).toContain("Prioritná podpora");
    expect(screen.getByTestId("band-network-features").textContent).toContain("Všetko z Kancelárie");
  });

  it("neplatný počet (0, prázdny, desatinný, záporný, nad limit) nevyberie pásmo a CTA je zablokované", async () => {
    const { fn } = mockFetch({});
    render(<PricingV2Plans config={v2Config()} />);
    for (const v of ["0", "", "2.5", "-3", "201"]) {
      await setUsers(v);
      expect(screen.queryByTestId("selected-net")).toBeNull();
      expect((screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it("v3 ponuka neobsahuje Owner Cockpit, seat ani slovo pilot", () => {
    const { container } = render(<PricingV2Plans config={v2Config({ yearlyAvailable: true })} now={PROMO_NOW} />);
    expect(container.textContent).not.toMatch(/Owner Cockpit|seat|pilot|\+\s?50|každý cent/i);
  });

  it("garancia má jediné znenie", () => {
    render(<PricingV2Plans config={v2Config()} />);
    expect(screen.getByTestId("guarantee").textContent).toBe("100 % vrátenie peňazí do 30 dní – bez otázok");
  });

  it("výber balíka ukáže jeho čistú aj konečnú cenu z katalógu (50–300)", async () => {
    render(<PricingV2Plans config={v2Config()} />);
    const user = userEvent.setup();
    const select = screen.getByLabelText("Mesačný balík kreditov") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["", "50", "100", "150", "200", "250", "300"]);
    await user.selectOptions(select, "150");
    expect(screen.getByTestId("selected-pack").textContent).toContain("74,00 €");
    expect(screen.getByTestId("selected-pack").textContent).toContain("91,02 €");
  });
});

describe("PricingV2Plans — stepper počtu maklérov a živý prepočet", () => {
  it("tlačidlá + / − menia počet o 1, pásmo a cena sa prepočítajú hneď (mesačne)", async () => {
    render(<PricingV2Plans config={v2Config()} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Počet maklérov") as HTMLInputElement;
    expect(input.value).toBe("1");
    expect((screen.getByTestId("seats-dec") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("selected-net").textContent).toBe("30,00 €");

    await user.click(screen.getByTestId("seats-inc"));
    expect(input.value).toBe("2");
    expect(screen.getByTestId("selected-band-label").textContent).toBe("Team");
    expect(screen.getByTestId("selected-net").textContent).toBe("60,00 €"); // 2 makléri = 2 × 25 € × 1,2

    for (let i = 0; i < 4; i++) await user.click(screen.getByTestId("seats-inc")); // 6
    expect(input.value).toBe("6");
    expect(screen.getByTestId("selected-band-label").textContent).toBe("Kancelária");
    expect(screen.getByTestId("selected-net").textContent).toBe("88,80 €");

    await user.click(screen.getByTestId("seats-dec")); // 5
    expect(screen.getByTestId("selected-band-label").textContent).toBe("Team");
    expect(screen.getByTestId("selected-net").textContent).toBe("78,00 €");
  });

  it("pásmo sa nevyberá ručne: karty pásiem nie sú ovládacie prvky, pásmo vyplýva z počtu", async () => {
    render(<PricingV2Plans config={v2Config()} />);
    for (const id of ["start", "team", "office", "network"]) {
      expect(screen.getByTestId(`band-${id}`).querySelector("button, input, select")).toBeNull();
    }
    await setUsers("11");
    expect(screen.getByTestId("band-network").getAttribute("data-selected")).toBe("true");
  });

  it("horná hranica steppera zablokuje +", async () => {
    render(<PricingV2Plans config={v2Config()} initialUsers={200} />);
    expect((screen.getByTestId("seats-inc") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("selected-band-label").textContent).toBe("Sieť");
  });

  it("počet nad 50 ide tarifou A+ (50 = 3 533,33 € ročne, 51 = +36 €)", async () => {
    render(<PricingV2Plans config={v2Config({ yearlyAvailable: true })} now={AFTER_PROMO} />);
    await setUsers("50");
    expect(screen.getByTestId("selected-net").textContent).toBe("3533,33 €");
    await setUsers("51");
    expect(screen.getByTestId("selected-net").textContent).toBe("3569,33 €");
  });
});

describe("PricingV2Plans — CTA a chyby checkoutu", () => {
  it("POST s telom { seats, interval } (+ obálka) a presmerovanie na url", async () => {
    const { checkoutCalls } = mockFetch({});
    const navigate = vi.fn();
    render(<PricingV2Plans config={v2Config()} navigate={navigate} />);
    await setUsers("7");
    await userEvent.setup().selectOptions(screen.getByLabelText("Mesačný balík kreditov"), "100");
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("https://stripe.test/pay"));
    const [call] = checkoutCalls();
    expect(call.init?.method).toBe("POST");
    const body = JSON.parse(String(call.init?.body));
    expect(body).toEqual({ checkoutType: "pricing_v2", seats: 7, packCredits: 100, interval: "month" });
    expect(body).not.toHaveProperty("band");
    expect(body).not.toHaveProperty("users");
  });

  it("bez balíka pošle packCredits: null", async () => {
    const { checkoutCalls } = mockFetch({});
    render(<PricingV2Plans config={v2Config()} navigate={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({ checkoutType: "pricing_v2", seats: 1, packCredits: null, interval: "month" });
  });

  const ERRORS: Array<[string, number, Json, RegExp]> = [
    ["404 pricing_v2_disabled", 404, { ok: false, error: "x", code: "pricing_v2_disabled" }, /Nový cenník zatiaľ nie je zapnutý/],
    ["409 legacy_subscription", 409, { ok: false, error: "x", code: "legacy_subscription" }, /Predplatné máte dohodnuté.*kontaktujte/],
    ["400 invalid_request", 400, { ok: false, error: "x", code: "invalid_request" }, /Skontrolujte počet maklérov/],
    ["503 prices_not_configured", 503, { ok: false, error: "x", code: "prices_not_configured", missing: ["STRIPE_PRICE_V3_SEAT_MONTHLY"] }, /Objednávka nie je zatiaľ dostupná/],
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
    expect(screen.getByTestId("band-team-gross").textContent).toBe("od 73,80 €");
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
    render(<PricingV2Plans config={v2Config({ checkoutAvailable: false, missingPriceEnvKeys: ["STRIPE_PRICE_V3_SEAT_MONTHLY"] })} navigate={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toMatch(/Objednávka nie je zatiaľ dostupná/);
    const btn = screen.getByRole("button", { name: /Pokračovať k objednávke/ }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await userEvent.setup().click(btn);
    expect(fn).not.toHaveBeenCalled();
    // názvy env sa používateľovi neukazujú
    expect(document.body.textContent).not.toContain("STRIPE_PRICE");
  });
});

describe("ročné platenie a akcia 9/12 — UI", () => {
  const yearlyConfig = () => v2Config({ yearlyAvailable: true });

  it("bez ročnej ceny sa prepínač nezobrazí a nákup ostáva mesačný", () => {
    render(<PricingV2Plans config={v2Config()} now={PROMO_NOW} />);
    expect(screen.queryByTestId("interval-year")).toBeNull();
    expect(screen.queryByTestId("promo-note")).toBeNull();
    expect(screen.getByTestId("band-team-net").textContent).toBe("od 60,00 €");
  });

  it("prepínač má popisy „Ročne (zľava 17 %)“ a „Mesačne“, predvolene je ročne", () => {
    render(<PricingV2Plans config={yearlyConfig()} now={PROMO_NOW} />);
    expect(screen.getByTestId("interval-year").textContent).toBe("Ročne (zľava 17 %)");
    expect(screen.getByTestId("interval-month").textContent).toBe("Mesačne");
    expect(screen.getByTestId("interval-year").getAttribute("aria-checked")).toBe("true");
  });

  it("ročne do 31. 12. 2026: ‚Prvý rok 3 mesiace zadarmo (platíte 9 z 12)‘, prvá faktúra = 9 × základ, od 2. roka bežná cena", async () => {
    render(<PricingV2Plans config={yearlyConfig()} now={PROMO_NOW} />);
    expect(screen.getByTestId("promo-note").textContent).toBe("Prvý rok 3 mesiace zadarmo (platíte 9 z 12)");
    // 1 maklér: základ 25 € -> prvá faktúra 225 €, bežná 300 €
    expect(screen.getByTestId("selected-net").textContent).toBe("225,00 €");
    expect(screen.getByTestId("selected-gross").textContent).toBe("276,75 €");
    expect(screen.getByTestId("year2-note").textContent).toBe("Od 2. roka bežná cena 300,00 € bez DPH (369,00 € s DPH) / rok.");
    // 3 makléri: základ 65 € -> 585 € / bežná 780 €
    await setUsers("3");
    expect(screen.getByTestId("selected-net").textContent).toBe("585,00 €");
    expect(screen.getByTestId("selected-gross").textContent).toBe("719,55 €");
    expect(screen.getByTestId("year2-note").textContent).toContain("780,00 €");
    expect(screen.getByTestId("year2-note").textContent).toContain("959,40 €");
  });

  it("karty pásiem pri ročnej platbe ukazujú základ (mesačne pri ročnej platbe)", () => {
    render(<PricingV2Plans config={yearlyConfig()} now={PROMO_NOW} />);
    expect(screen.getByTestId("band-start-net").textContent).toBe("25,00 €");
    expect(screen.getByTestId("band-start-gross").textContent).toBe("30,75 €");
    expect(screen.getByTestId("band-team-net").textContent).toBe("od 50,00 €");
    expect(screen.getByTestId("band-team-gross").textContent).toBe("od 61,50 €");
    expect(screen.getByTestId("band-office-net").textContent).toBe("od 74,00 €");
    expect(screen.getByTestId("band-network-net").textContent).toBe("od 116,00 €");
  });

  it("po 31. 12. 2026 22:59:59Z akcia zmizne a ročne sa platí 12 × základ", async () => {
    render(<PricingV2Plans config={yearlyConfig()} now={AFTER_PROMO} />);
    expect(screen.queryByTestId("promo-note")).toBeNull();
    expect(screen.queryByTestId("year2-note")).toBeNull();
    await setUsers("3");
    expect(screen.getByTestId("selected-net").textContent).toBe("780,00 €");
    expect(screen.getByTestId("selected-gross").textContent).toBe("959,40 €");
    expect(document.body.textContent).not.toMatch(/zadarmo|9 z 12/);
  });

  it("v poslednej sekunde akcie ešte platí, o sekundu neskôr už nie", () => {
    render(<PricingV2Plans config={yearlyConfig()} now={new Date("2026-12-31T22:59:59Z")} />);
    expect(screen.getByTestId("promo-note")).toBeTruthy();
    cleanup();
    render(<PricingV2Plans config={yearlyConfig()} now={new Date("2026-12-31T23:00:00Z")} />);
    expect(screen.queryByTestId("promo-note")).toBeNull();
  });

  it("prepnutie na mesačne: bez akcie, cena = základ × 1,2, poznámka o ročnej zľave", async () => {
    render(<PricingV2Plans config={yearlyConfig()} now={PROMO_NOW} />);
    const user = userEvent.setup();
    await setUsers("3");
    await user.click(screen.getByTestId("interval-month"));
    expect(screen.queryByTestId("promo-note")).toBeNull();
    expect(screen.getByTestId("selected-net").textContent).toBe("78,00 €");
    expect(screen.getByTestId("selected-gross").textContent).toBe("95,94 €");
    expect(screen.getByTestId("monthly-note").textContent).toContain("17 %");
    // a späť na ročné: akcia sa vráti
    await user.click(screen.getByTestId("interval-year"));
    expect(screen.getByTestId("promo-note")).toBeTruthy();
  });

  it("ročný nákup pošle { seats, interval: year } bez balíka kreditov", async () => {
    const { checkoutCalls } = mockFetch({});
    render(<PricingV2Plans config={yearlyConfig()} navigate={vi.fn()} now={PROMO_NOW} />);
    const user = userEvent.setup();
    await setUsers("4");
    await user.click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({
      checkoutType: "pricing_v2",
      seats: 4,
      packCredits: null,
      interval: "year",
    });
  });

  it("výber balíka sa pri ročnom platení skryje a nepošle sa", async () => {
    render(<PricingV2Plans config={v2Config({ yearlyAvailable: true, plansOnly: false })} now={PROMO_NOW} />);
    expect(screen.queryByLabelText("Mesačný balík kreditov")).toBeNull();
    await userEvent.setup().click(screen.getByTestId("interval-month"));
    expect(screen.getByLabelText("Mesačný balík kreditov")).toBeTruthy();
  });

  it("porovnanie ukazuje ročnú aj mesačnú cenu každého pásma, garanciu a kredity 25 / 60 / 120 / 175", () => {
    render(<PricingV2Comparison config={v2Config()} />);
    expect(screen.getByTestId("compare-team-annual").textContent).toContain("600,00 €");
    expect(screen.getByTestId("compare-team-annual").textContent).toContain("738,00 €");
    expect(screen.getByTestId("compare-team-monthly").textContent).toContain("60,00 €");
    expect(screen.getByTestId("compare-team-monthly").textContent).toContain("73,80 €");
    expect(screen.getByTestId("compare-guarantee").textContent).toBe("100 % vrátenie peňazí do 30 dní – bez otázok");
    expect(screen.getByTestId("compare-start").textContent).toContain("25 kreditov mesačne pre celú kanceláriu");
    expect(screen.getByTestId("compare-team").textContent).toContain("60 kreditov mesačne pre celú kanceláriu");
    expect(screen.getByTestId("compare-office").textContent).toContain("120 kreditov mesačne pre celú kanceláriu");
    expect(screen.getByTestId("compare-network").textContent).toContain("175 kreditov mesačne pre celú kanceláriu");
  });
});

describe("režim „len plány“ — UI", () => {
  const plansOnly = () => v2Config({ plansOnly: true, catalog: { ...buildPricingV2Catalog(), packs: [] } });

  it("PricingV2Plans nezobrazí výber balíka", () => {
    render(<PricingV2Plans config={plansOnly()} />);
    expect(screen.queryByLabelText("Mesačný balík kreditov")).toBeNull();
    expect(screen.getByLabelText("Počet maklérov")).toBeTruthy();
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
    expect(screen.getByTestId("credits-price").textContent).toContain("37,50 €");
    expect(screen.getByTestId("credits-price").textContent).toContain("46,13 €");
    fireEvent.change(screen.getByLabelText("Počet kreditov"), { target: { value: "100" } });
    expect(screen.getByTestId("credits-price").textContent).toContain("75,00 €");
    expect(screen.getByTestId("credits-price").textContent).toContain("92,25 €");
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

  it("Upgrade: vypnuté v2 a chýbajúce Price ID ukáže názvy premenných, nie hodnoty", async () => {
    mockFetch({
      configBody: {
        ...LEGACY_CONFIG,
        seatCheckoutAvailable: false,
        topupCheckoutAvailable: false,
        checkoutAvailable: false,
        missingPriceEnvKeys: {
          seat: ["STRIPE_PRICE_SOLO_SEAT", "price_1ShouldNotRender"],
          topup: ["STRIPE_PRICE_CREDITS_START"],
        },
      },
    });
    render(<UpgradePage />);
    expect(await screen.findByText(/chýbajú Stripe Price ID/)).toBeTruthy();
    const list = screen.getByTestId("missing-price-env");
    expect(list.textContent).toContain("STRIPE_PRICE_SOLO_SEAT");
    expect(list.textContent).toContain("STRIPE_PRICE_CREDITS_START");
    expect(list.textContent).not.toContain("price_1ShouldNotRender");
    expect(document.body.textContent).not.toMatch(/sk_live|rk_live|whsec_/);
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
    expect(screen.getByTestId("compare-team").textContent).toContain("50,00 €");
    expect(screen.getByTestId("compare-team").textContent).toContain("61,50 €");
    expect(document.body.textContent).not.toMatch(/PROTOCOL AUTHORITY|Owner Cockpit|449/);
  });

  it("Upgrade: v2 plán + jednorazové kredity, bez seat sekcie a Owner Cockpitu; CTA volá pricing_v2", async () => {
    const { checkoutCalls } = mockFetch({ configBody: ON_BODY });
    render(<UpgradePage />);
    expect(await screen.findByTestId("pricing-v2-plans")).toBeTruthy();
    expect(screen.getByTestId("pricing-v2-credits")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Owner Cockpit|Seat program|Pokračovať do Stripe/);
    await setUsers("26");
    // 26 maklérov, tarifa A+: 231,60 € bez DPH -> s DPH 284,87 €
    expect(screen.getByTestId("selected-gross").textContent).toBe("284,87 €");
    await userEvent.setup().click(screen.getByRole("button", { name: /Pokračovať k objednávke/ }));
    await waitFor(() => expect(checkoutCalls()).toHaveLength(1));
    expect(JSON.parse(String(checkoutCalls()[0].init?.body))).toEqual({ checkoutType: "pricing_v2", seats: 26, packCredits: null, interval: "month" });
  });

  it("Upgrade: zapnuté v2, ale ceny nenastavené -> „nie je dostupná“ (nie rozbitá stránka)", async () => {
    mockFetch({
      configBody: {
        ...LEGACY_CONFIG,
        seatCheckoutAvailable: false,
        topupCheckoutAvailable: false,
        checkoutAvailable: false,
        pricingV2: { enabled: true, checkoutAvailable: false, missingPriceEnvKeys: ["STRIPE_PRICE_V3_SEAT_MONTHLY"], catalog: buildPricingV2Catalog() },
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
