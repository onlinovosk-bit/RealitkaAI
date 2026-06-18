import { describe, expect, it } from "vitest";
import {
  countUnread,
  filterInboxNotifications,
  type InboxNotification,
} from "./notification-inbox-types";

const SAMPLE: InboxNotification[] = [
  {
    id: "n-1",
    type: "seller_rescue",
    priority: "high",
    title: "A",
    body: null,
    read_at: null,
    created_at: "2026-06-10T08:00:00Z",
  },
  {
    id: "n-2",
    type: "ceo_command",
    priority: "normal",
    title: "B",
    body: null,
    read_at: "2026-06-09T10:00:00Z",
    created_at: "2026-06-09T07:00:00Z",
  },
];

describe("notification-inbox-types", () => {
  it("filters unread and read", () => {
    expect(filterInboxNotifications(SAMPLE, "all")).toHaveLength(2);
    expect(filterInboxNotifications(SAMPLE, "unread")).toHaveLength(1);
    expect(filterInboxNotifications(SAMPLE, "read")).toHaveLength(1);
  });

  it("counts unread", () => {
    expect(countUnread(SAMPLE)).toBe(1);
    expect(countUnread([])).toBe(0);
  });
});
