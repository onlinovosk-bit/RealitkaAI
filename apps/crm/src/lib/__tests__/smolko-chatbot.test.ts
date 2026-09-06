import { describe, expect, it } from "vitest";
import { answerSmolkoChatQuestion } from "@/lib/smolko-chatbot";
import type { Lead } from "@/lib/mock-data";
import type { Task } from "@/lib/tasks-store";

const now = new Date("2026-09-06T10:00:00.000Z");

function lead(overrides: Partial<Lead>): Lead {
  return {
    id: overrides.id ?? "lead-1",
    name: overrides.name ?? "Test Lead",
    email: overrides.email ?? "test@example.com",
    phone: overrides.phone ?? "+421900000000",
    location: overrides.location ?? "Bratislava",
    budget: overrides.budget ?? "250000",
    propertyType: overrides.propertyType ?? "Byt",
    rooms: overrides.rooms ?? "3",
    financing: overrides.financing ?? "Hypotéka",
    timeline: overrides.timeline ?? "Do 1 mesiaca",
    source: overrides.source ?? "Realvia",
    status: overrides.status ?? "Nový",
    score: overrides.score ?? 50,
    assignedAgent: overrides.assignedAgent ?? "Maklér",
    assignedProfileId: overrides.assignedProfileId ?? null,
    lastContact: overrides.lastContact ?? "2026-09-05T10:00:00.000Z",
    note: overrides.note ?? "",
    aiPriority: overrides.aiPriority,
    aiReason: overrides.aiReason,
    createdAt: overrides.createdAt,
  };
}

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-1",
    leadId: overrides.leadId ?? null,
    assignedProfileId: overrides.assignedProfileId ?? null,
    title: overrides.title ?? "Zavolať leadovi",
    description: overrides.description ?? "",
    status: overrides.status ?? "open",
    priority: overrides.priority ?? "medium",
    dueAt: overrides.dueAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt,
  };
}

describe("answerSmolkoChatQuestion", () => {
  it("prioritizes calls from CRM score, status and stale contact without LLM", () => {
    const answer = answerSmolkoChatQuestion({
      question: "Komu mám volať dnes?",
      now,
      tasks: [],
      leads: [
        lead({ name: "Studený lead", status: "Nový", score: 40 }),
        lead({
          name: "Horúci stale lead",
          status: "Horúci",
          score: 72,
          lastContact: "2026-08-20T10:00:00.000Z",
          aiReason: "má rozpočet",
        }),
      ],
    });

    expect(answer.intent).toBe("priority");
    expect(answer.title).toBe("Komu volať teraz");
    expect(answer.bullets[0]).toContain("Horúci stale lead");
    expect(answer.bullets[0]).toContain("posledný kontakt 17 dní dozadu");
    expect(answer.sources).toContainEqual({ label: "tenant-scoped leads", count: 2 });
  });

  it("keeps unknown questions bounded to supported CRM prompts", () => {
    const answer = answerSmolkoChatQuestion({
      question: "Predpovedz trh na tri mesiace",
      now,
      leads: [],
      tasks: [],
    });

    expect(answer.intent).toBe("fallback");
    expect(answer.answer).toContain("iba na CRM priority");
    expect(answer.bullets).toContain("Komu mám volať dnes?");
  });

  it("orders open tasks by due date before priority", () => {
    const answer = answerSmolkoChatQuestion({
      question: "Čo mám vybaviť ako prvé?",
      now,
      leads: [],
      tasks: [
        task({ title: "Neskôr high", priority: "high", dueAt: "2026-09-08T10:00:00.000Z" }),
        task({ title: "Dnes medium", priority: "medium", dueAt: "2026-09-06T12:00:00.000Z" }),
        task({ title: "Hotovo", status: "done", priority: "high", dueAt: "2026-09-06T11:00:00.000Z" }),
      ],
    });

    expect(answer.intent).toBe("tasks");
    expect(answer.bullets[0]).toContain("Dnes medium");
    expect(answer.bullets).not.toEqual(expect.arrayContaining([expect.stringContaining("Hotovo")]));
  });
});
