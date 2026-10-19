// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RoiGuaranteeSection from "../RoiGuaranteeSection";
import { FearReductionSection } from "@/components/landing/FearReductionSection";
import { CTASection } from "@/components/landing/CTASection";
import { CtaAbProvider } from "@/components/landing/CtaAbProvider";
import { GUARANTEE_TEXT } from "../guarantee-copy";
import { htmlText } from "./golden";

const SRC = path.resolve(__dirname, "../../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "__golden__" || entry.name === "fonts") continue;
      walk(full, out);
    } else if (/\.(tsx?|ts)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

/** Zákaznícke zdroje, za ktoré zodpovedá cenník v3 UI (marketing, landing, billing v2, VOP v3). */
const CUSTOMER_FACING = [
  ...walk(path.join(SRC, "components/marketing")),
  ...walk(path.join(SRC, "components/landing")),
  ...walk(path.join(SRC, "components/billing/v2")),
  ...walk(path.join(SRC, "app/(marketing)/landing")),
  path.join(SRC, "app/(public)/terms/terms-v2.ts"),
  path.join(SRC, "app/(public)/terms/page.tsx"),
];

describe("garancia: jediné znenie, bez „+50 €“, „každý cent“ a slova pilot", () => {
  it("kanonické znenie", () => {
    expect(GUARANTEE_TEXT).toBe("100 % vrátenie peňazí do 30 dní – bez otázok");
  });

  it("v zákazníckych zdrojoch nie je „+50“, „každý cent“ ani samostatné slovo „pilot“", () => {
    expect(CUSTOMER_FACING.length).toBeGreaterThan(20);
    for (const file of CUSTOMER_FACING) {
      const src = fs.readFileSync(file, "utf8");
      const rel = path.relative(SRC, file);
      expect(src, `${rel}: +50`).not.toMatch(/\+\s?50\s?(€|eur)|navyše\s*\+\s?50/i);
      expect(src, `${rel}: každý cent`).not.toMatch(/každý cent/i);
      expect(src, `${rel}: pilot`).not.toMatch(/(^|[^a-zA-Z])pilot/i);
      expect(src, `${rel}: stará zľava 30-dňová garancia`).not.toMatch(/30-dňov[áéú]\s+(záruka|garancia)/i);
    }
  });

  it("RoiGuaranteeSection nesie kanonické znenie a nie starú ponuku", () => {
    const t = htmlText(renderToStaticMarkup(createElement(RoiGuaranteeSection)));
    expect(t).toContain(GUARANTEE_TEXT);
    expect(t).not.toMatch(/\+\s?50|každý cent|100% ROI|pilot/i);
  });

  it("FearReductionSection a CTASection nesú kanonické znenie", () => {
    expect(htmlText(renderToStaticMarkup(createElement(FearReductionSection)))).toContain(GUARANTEE_TEXT);
    const cta = renderToStaticMarkup(createElement(CtaAbProvider, null, createElement(CTASection)));
    expect(htmlText(cta)).toContain(GUARANTEE_TEXT);
  });
});
