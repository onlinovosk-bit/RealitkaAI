/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkdeskTopbar } from "@/components/layout/WorkdeskTopbar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabaseClient: { auth: { signOut: vi.fn() } },
}));

describe("WorkdeskTopbar search", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("submits trimmed query to /leads?q=", async () => {
    const user = userEvent.setup();
    render(<WorkdeskTopbar userName="Test" />);
    await user.type(screen.getByLabelText(/Filtrovať zobrazené leady/i), "  bratislava ");
    await user.click(screen.getByTestId("workdesk-search-submit"));
    expect(push).toHaveBeenCalledWith("/leads?q=bratislava");
  });

  it("empty submit goes to /leads", async () => {
    const user = userEvent.setup();
    render(<WorkdeskTopbar userName="Test" />);
    await user.click(screen.getByTestId("workdesk-search-submit"));
    expect(push).toHaveBeenCalledWith("/leads");
  });
});
