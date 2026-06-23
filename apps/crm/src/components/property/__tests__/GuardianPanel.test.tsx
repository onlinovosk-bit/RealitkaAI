/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GuardianPanel from "@/components/property/GuardianPanel";
import { buildGuardianPropertyEditHref } from "@/lib/capabilities/quality-guardian/property-edit-href";
import type { GuardianPanelView } from "@/lib/capabilities/quality-guardian/panel-map";

const baseView: GuardianPanelView = {
  hasOutput: true,
  status: "needs_data",
  statusLabel: "Treba doplniť údaje",
  nextStepSummary: "Doplňte 5 chýbajúce údaje v ponuke — inzerát bude silnejší a dôveryhodnejší.",
  completenessPercent: 44,
  fieldsChecked: 4,
  fieldsTotal: 9,
  passItems: [{ id: "photos", label: "Fotky", detail: "1 fotiek" }],
  todoItems: [
    {
      id: "price",
      label: "Cena",
      detail: "0 alebo chýbajúca cena",
      actionLabel: "Zadajte predajnú cenu",
    },
  ],
  flags: [],
  publishBlocked: false,
};

describe("GuardianPanel", () => {
  it("renders empty state when no guardian output", () => {
    render(
      <GuardianPanel
        view={{
          hasOutput: false,
          status: "needs_data",
          statusLabel: "Treba doplniť údaje",
          nextStepSummary: "Po načítaní ponuky tu uvidíte, čo treba doplniť pred odoslaním.",
          completenessPercent: null,
          fieldsChecked: 0,
          fieldsTotal: 0,
          passItems: [],
          todoItems: [],
          flags: [],
          publishBlocked: false,
        }}
      />,
    );
    expect(screen.getByTestId("guardian-panel-empty")).toBeTruthy();
  });

  it("shows value prop, status, todos and action links", () => {
    const editHref = buildGuardianPropertyEditHref("13303557");
    render(
      <GuardianPanel
        view={baseView}
        propertyTitle="Predaj RD"
        propertyEditHref={editHref}
      />,
    );
    expect(screen.getByTestId("guardian-panel")).toBeTruthy();
    expect(screen.getByTestId("guardian-status-badge").textContent).toContain("Treba doplniť");
    expect(screen.getByTestId("guardian-next-step")).toBeTruthy();
    expect(screen.getByTestId("guardian-todo-price")).toBeTruthy();
    const href = screen.getByTestId("guardian-action-edit").getAttribute("href");
    expect(href).toContain("source_id=13303557");
    expect(href).not.toBe("/properties");
    expect(screen.getByTestId("guardian-action-preview").getAttribute("href")).toBe(
      "#listing-preview",
    );
  });

  it("shows blocking flag with action hint", () => {
    const view: GuardianPanelView = {
      ...baseView,
      status: "blocked",
      statusLabel: "Treba opraviť rozpor v údajoch",
      flags: [
        {
          id: "free_text_area_mismatch:167",
          severity: "blocking",
          label: "Rozpor v ploche",
          message: "167 m² vs polia ponuky",
          actionLabel: "Upravte plochu alebo popis v ponuke",
        },
      ],
      publishBlocked: true,
    };
    render(<GuardianPanel view={view} publishFlowAvailable={true} />);
    expect(screen.getByText("Rozpor v ploche")).toBeTruthy();
    const btn = screen.getByTestId("guardian-publish-button");
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("shows publish follow-up instead of dead publish button when flow not wired", () => {
    render(<GuardianPanel view={baseView} publishFlowAvailable={false} />);
    expect(screen.getByTestId("guardian-publish-followup")).toBeTruthy();
    expect(screen.queryByTestId("guardian-publish-button")).toBeNull();
  });
});
