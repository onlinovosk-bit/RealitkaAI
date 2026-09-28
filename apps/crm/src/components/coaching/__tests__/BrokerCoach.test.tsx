import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BrokerCoach from "../BrokerCoach";

describe("BrokerCoach", () => {
  it("renders only the insight when no value has a source", () => {
    const { container } = render(
      <BrokerCoach
        insight="Fakty z tvojich dát"
        streakDays={null}
        brokerStats={{ followUpRankLabel: null, dealVelocityLabel: null, dealVelocityDeltaLabel: null }}
      />,
    );
    expect(screen.getByText(/Fakty z tvojich dát/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Streak|Follow-up Rank|Deal Velocity|Prešov/);
  });

  it("renders a measured velocity without an invented comparison", () => {
    const { container } = render(
      <BrokerCoach
        insight="x"
        streakDays={null}
        brokerStats={{ followUpRankLabel: null, dealVelocityLabel: "25 DNÍ", dealVelocityDeltaLabel: null }}
      />,
    );
    expect(screen.getByText("25 DNÍ")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/priemer|Follow-up Rank|Prešov/);
  });
});
