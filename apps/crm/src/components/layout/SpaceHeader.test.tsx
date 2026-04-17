import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import SpaceHeader from "./SpaceHeader";

vi.mock("@/store/aiActivityStore", () => ({
  useAIActivityStore: (sel: (s: unknown) => unknown) =>
    sel({
      sofiaStatus: "idle",
      sofiaStatusText: "AI Asistent je pripravený",
      activities: [],
    }),
}));

vi.mock("@/components/auth/auth-button", () => ({
  default: () => <button type="button">auth</button>,
}));

vi.mock("@/components/layout/app-mode-toggle", () => ({
  AppModeToggle: () => <span data-testid="mode">mode</span>,
}));

describe("SpaceHeader", () => {
  it("SSR HTML has no live clock text (avoids React #418 hydration mismatch)", () => {
    const html = renderToString(<SpaceHeader userName="u@example.com" />);
    // Čas (HH:MM:SS) vzniká až v useEffect — v SSR reťazci nesmie byť.
    expect(html).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(html).toMatch(/font-mono/);
  });
});
