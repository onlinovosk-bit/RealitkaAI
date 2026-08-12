import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationInboxBell from "./NotificationInboxBell";

const OWNER_NOTIFICATIONS = [
  {
    id: "n-ceo-1",
    type: "ceo_command",
    priority: "high",
    title: "Týždenný výkon tímu",
    body: "Pipeline +12 %.",
    read_at: null,
    created_at: "2026-06-10T08:00:00Z",
  },
  {
    id: "n-read-1",
    type: "seller_rescue",
    priority: "normal",
    title: "Prečítané upozornenie",
    body: null,
    read_at: "2026-06-09T10:00:00Z",
    created_at: "2026-06-09T07:00:00Z",
  },
];

describe("NotificationInboxBell", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/notifications/inbox")) {
          return new Response(
            JSON.stringify({ ok: true, notifications: OWNER_NOTIFICATIONS, scope: "owner" }),
            { status: 200 },
          );
        }
        if (url.includes("/read") && init?.method === "POST") {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: false }), { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders bell without badge when closed and not loaded", () => {
    render(<NotificationInboxBell />);
    expect(screen.getByTestId("notification-inbox-bell")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-inbox-badge")).not.toBeInTheDocument();
  });

  it("loads notifications and shows unread badge after opening panel", async () => {
    render(<NotificationInboxBell />);
    fireEvent.click(screen.getByTestId("notification-inbox-bell"));

    await waitFor(() => {
      expect(screen.getByTestId("notification-inbox-list")).toBeInTheDocument();
    });

    expect(screen.getByTestId("notification-inbox-badge")).toHaveTextContent("1");
    expect(screen.getByText("Týždenný výkon tímu")).toBeInTheDocument();
  });

  it("shows honest empty state for agent scope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ ok: true, notifications: [], scope: "agent" }),
          { status: 200 },
        ),
      ),
    );

    render(<NotificationInboxBell />);
    fireEvent.click(screen.getByTestId("notification-inbox-bell"));

    await waitFor(() => {
      expect(screen.getByTestId("notification-inbox-empty")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Keď rutiny vygenerujú upozornenie priamo pre vás/i),
    ).toBeInTheDocument();
  });

  it("filters to read-only items", async () => {
    render(<NotificationInboxBell />);
    fireEvent.click(screen.getByTestId("notification-inbox-bell"));

    await waitFor(() => {
      expect(screen.getByTestId("notification-inbox-list")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("notification-inbox-filter-read"));

    expect(screen.queryByText("Týždenný výkon tímu")).not.toBeInTheDocument();
    expect(screen.getByText("Prečítané upozornenie")).toBeInTheDocument();
  });

  it("marks notification as read", async () => {
    render(<NotificationInboxBell />);
    fireEvent.click(screen.getByTestId("notification-inbox-bell"));

    await waitFor(() => {
      expect(screen.getByTestId("notification-inbox-mark-read-n-ceo-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("notification-inbox-mark-read-n-ceo-1"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("notification-inbox-mark-read-n-ceo-1"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("notification-inbox-read-label-n-ceo-1")).toBeInTheDocument();
    });
  });
});
