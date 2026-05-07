import { NextResponse } from "next/server";
import { createTask } from "@/lib/tasks-store";
import { createActivity } from "@/lib/activities-store";
import { autoErrorCapture } from "@/lib/auto-error-capture";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (!String(body.leadId ?? "").trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Vyber lead. Úloha bez leadu sa nedá uložiť.",
        },
        { status: 400 }
      );
    }

    const task = await createTask({
      leadId: body.leadId,
      assignedProfileId: body.assignedProfileId ?? null,
      title: body.title ?? "",
      description: body.description ?? "",
      status: body.status ?? "open",
      priority: body.priority ?? "medium",
      dueAt: body.dueAt ?? null,
    });

    await createActivity({
      leadId: task.leadId ?? null,
      type: "Úloha",
      title: "Vytvorená úloha",
      text: `Bola vytvorená úloha: ${task.title}.`,
      entityType: "task",
      entityId: task.id,
      actorName: "Systém",
      source: "tasks",
      severity: "info",
      meta: {
        priority: task.priority,
        status: task.status,
      },
    });

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    const result = autoErrorCapture(error, "POST /api/tasks");
    return NextResponse.json(result, { status: 400 });
  }
}