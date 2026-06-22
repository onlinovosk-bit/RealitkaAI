/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GuardianPanel from "@/components/property/GuardianPanel";
import type { GuardianPanelView } from "@/lib/capabilities/quality-guardian/panel-map";

const baseView: GuardianPanelView = {
  hasOutput: true,
  completenessPercent: 89,
  fieldsChecked: 8,
  fieldsTotal: 9,
  passItems: [{ id: "photos", label: "Fotky", detail: "12 fotiek" }],
  flags: [],
  publishBlocked: false,
};

describe("GuardianPanel", () => {
  it("renders empty state when no guardian output", () => {
    render(
      <GuardianPanel
        view={{
          hasOutput: false,
          completenessPercent: null,
          fieldsChecked: 0,
          fieldsTotal: 0,
          passItems: [],
          flags: [],
          publishBlocked: false,
        }}
      />,
    );
    expect(screen.getByTestId("guardian-panel-empty")).toBeTruthy();
    expect(screen.getByText("Kontrola ešte neprebehla.")).toBeTruthy();
  });

  it("shows score and enabled publish intent when no blocking flags", () => {
    render(<GuardianPanel view={baseView} publishFlowAvailable={true} />);
    expect(screen.getByTestId("guardian-panel")).toBeTruthy();
    expect(screen.getByText("89%")).toBeTruthy();
    const btn = screen.getByTestId("guardian-publish-button");
    expect(btn.hasAttribute("disabled")).toBe(false);
    expect(btn.textContent).toContain("Potvrdiť a zverejniť");
  });

  it("disables publish button when blocking flag present", () => {
    const view: GuardianPanelView = {
      ...baseView,
      flags: [
        {
          id: "free_text_area_mismatch:167",
          severity: "blocking",
          label: "Rozpor v ploche",
          message: "167 m² vs 120 m²",
        },
      ],
      publishBlocked: true,
    };
    render(<GuardianPanel view={view} publishFlowAvailable={true} />);
    const btn = screen.getByTestId("guardian-publish-button");
    expect(btn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Rozpor v ploche")).toBeTruthy();
  });

  it("shows publish follow-up when flow not wired", () => {
    render(<GuardianPanel view={baseView} publishFlowAvailable={false} />);
    expect(screen.getByTestId("guardian-publish-followup")).toBeTruthy();
    expect(screen.getByTestId("guardian-publish-button").hasAttribute("disabled")).toBe(true);
  });
});
