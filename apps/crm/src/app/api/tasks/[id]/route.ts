import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteTask, updateTask } from "@/lib/tasks-store";
import { createActivity } from "@/lib/activities-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

  try {
    const { id } = await params;
    const body = await request.json();

    if (!String(body.leadId ?? "").trim()) {
      return NextResponse.json(
        { ok: false, error: "Vyber lead. Úloha bez leadu sa nedá uložiť." },
        { status: 400 }
      );
    }

    if (callerProfile?.agency_id) {
      const { data: leadRow } = await supabase
        .from("leads").select("agency_id").eq("id", body.leadId).maybeSingle();
      if (leadRow?.agency_id !== callerProfile.agency_id) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const completedAt =
      body.status === "done" ? new Date().toISOString() : body.completedAt ?? null;

    const task = await updateTask(id, {
      leadId:            body.leadId,
      assignedProfileId: body.assignedProfileId,
      title:             body.title,
      description:       body.description,
      status:            body.status,
      priority:          body.priority,
      dueAt:             body.dueAt,
      completedAt,
    });

    await createActivity({
      leadId:     task.leadId ?? null,
      type:       "Úloha",
      title:      "Upravená úloha",
      text:       task.status === "done"
        ? `Úloha "${task.title}" bola označená ako dokončená.`
        : `Úloha "${task.title}" bola upravená.`,
      entityType: "task",
      entityId:   task.id,
      actorName:  "Systém",
      source:     "tasks",
      severity:   task.status === "done" ? "success" : "info",
      meta:       { priority: task.priority, status: task.status },
    });

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa upraviť úlohu." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("id", user.id).maybeSingle();

  try {
    const { id } = await params;

    if (callerProfile?.agency_id) {
      const { data: taskRow } = await supabase
        .from("tasks").select("lead_id").eq("id", id).maybeSingle();
      if (taskRow?.lead_id) {
        const { data: leadRow } = await supabase
          .from("leads").select("agency_id").eq("id", taskRow.lead_id).maybeSingle();
        if (leadRow?.agency_id !== callerProfile.agency_id) {
          return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }
      }
    }

    await deleteTask(id);

    await createActivity({
      leadId:     null,
      type:       "Úloha",
      title:      "Zmazaná úloha",
      text:       "Úloha bola zmazaná zo systému.",
      entityType: "task",
      entityId:   id,
      actorName:  "Systém",
      source:     "tasks",
      severity:   "warning",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa zmazať úlohu." },
      { status: 400 }
    );
  }
}
