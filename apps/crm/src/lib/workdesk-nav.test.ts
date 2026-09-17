import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WORKDESK_RAIL } from "./workdesk-nav";

const dashboardRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../app/(dashboard)",
);

function dashboardRouteExists(href: string): boolean {
  const rel = href.replace(/^\//, "");
  return (
    existsSync(join(dashboardRoot, rel, "page.tsx")) ||
    existsSync(join(dashboardRoot, rel, "page.ts"))
  );
}

describe("WORKDESK_RAIL", () => {
  it("keeps existing five items, then Prítok and Trh", () => {
    expect(WORKDESK_RAIL.map((item) => item.id)).toEqual([
      "money",
      "call",
      "leads",
      "tasks",
      "forecast",
      "inflow",
      "market",
    ]);
    expect(WORKDESK_RAIL.map((item) => item.label)).toEqual([
      "Peniaze",
      "Volať",
      "Leady",
      "Úlohy",
      "Obrat",
      "Prítok",
      "Trh",
    ]);
    expect(WORKDESK_RAIL).toHaveLength(7);
  });

  it("does not add Dokumenty — no documents route in repo", () => {
    expect(WORKDESK_RAIL.some((item) => item.href.includes("dokument"))).toBe(false);
    expect(WORKDESK_RAIL.some((item) => item.label.toLowerCase().includes("dokument"))).toBe(
      false,
    );
  });

  it("keeps original hrefs for the first five items", () => {
    expect(WORKDESK_RAIL[0]?.href).toBe("/dashboard");
    expect(WORKDESK_RAIL[1]?.href).toBe("/contacts");
    expect(WORKDESK_RAIL[2]?.href).toBe("/leads");
    expect(WORKDESK_RAIL[3]?.href).toBe("/tasks");
    expect(WORKDESK_RAIL[4]?.href).toBe("/forecast");
    expect(WORKDESK_RAIL[5]?.href).toBe("/pritok");
    expect(WORKDESK_RAIL[6]?.href).toBe("/trh");
  });

  it("matches new paths and ignores siblings", () => {
    const inflow = WORKDESK_RAIL.find((item) => item.id === "inflow");
    const market = WORKDESK_RAIL.find((item) => item.id === "market");
    expect(inflow?.match("/pritok")).toBe(true);
    expect(inflow?.match("/pritok/detail")).toBe(true);
    expect(inflow?.match("/leads")).toBe(false);
    expect(market?.match("/trh")).toBe(true);
    expect(market?.match("/trh/x")).toBe(true);
    expect(market?.match("/forecast")).toBe(false);
  });

  it("does not point any item at a missing dashboard route", () => {
    for (const item of WORKDESK_RAIL) {
      expect(dashboardRouteExists(item.href), item.href).toBe(true);
    }
  });
});
