import { supabaseClient } from "@/lib/supabase/client";

export type Task = {
  id: string;
  leadId: string | null;
  assignedProfileId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt?: string;
};

export type TaskInput = {
  leadId?: string | null;
  assignedProfileId?: string | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: string | null;
};

const demoTasks: Task[] = [
  {
    id: "task-1",
    leadId: null,
    assignedProfileId: null,
    title: "Kontaktovať horúce leady",
    description: "Skontrolovať leady s vysokým score a navrhnúť obhliadku.",
    status: "open",
    priority: "high",
    dueAt: null,
    completedAt: null,
  },
];

const globalTasksStore = globalThis as typeof globalThis & {
  __realitkaDemoTasks?: Task[];
};

function getDemoTasksStore() {
  if (!globalTasksStore.__realitkaDemoTasks) {
    globalTasksStore.__realitkaDemoTasks = [...demoTasks];
  }

  return globalTasksStore.__realitkaDemoTasks;
}

export const taskStatusOptions = ["open", "in_progress", "done"];
export const taskPriorityOptions = ["low", "medium", "high"];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return supabaseClient;
}

function normalizeLeadId(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export async function listTasks(): Promise<Task[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [...getDemoTasksStore()].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("listTasks error:", error?.message);
    return demoTasks;
  }

  return data.map((item: any) => ({
    id: item.id,
    leadId: item.lead_id ?? null,
    assignedProfileId: item.assigned_profile_id ?? null,
    title: item.title,
    description: item.description ?? "",
    status: item.status ?? "open",
    priority: item.priority ?? "medium",
    dueAt: item.due_at ?? null,
    completedAt: item.completed_at ?? null,
    createdAt: item.created_at,
  }));
}

export async function createTask(input: TaskInput) {
  const supabase = getSupabaseClient();
  const leadId = normalizeLeadId(input.leadId);

  if (!leadId) {
    throw new Error("Úloha musí byť naviazaná na lead. Vyber lead pred uložením.");
  }

  if (!supabase) {
    const createdTask: Task = {
      id: crypto.randomUUID(),
      leadId,
      assignedProfileId: input.assignedProfileId ?? null,
      title: input.title,
      description: input.description ?? "",
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      dueAt: input.dueAt ?? null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    const store = getDemoTasksStore();
    store.unshift(createdTask);
    return createdTask;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      lead_id: leadId,
      assigned_profile_id: input.assignedProfileId ?? null,
      title: input.title,
      description: input.description ?? "",
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      due_at: input.dueAt ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    leadId: data.lead_id ?? null,
    assignedProfileId: data.assigned_profile_id ?? null,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "open",
    priority: data.priority ?? "medium",
    dueAt: data.due_at ?? null,
    completedAt: data.completed_at ?? null,
    createdAt: data.created_at,
  };
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput & { completedAt: string | null }>
) {
  const supabase = getSupabaseClient();
  const normalizedLeadId =
    typeof input.leadId !== "undefined" ? normalizeLeadId(input.leadId) : undefined;

  if (typeof input.leadId !== "undefined" && !normalizedLeadId) {
    throw new Error("Úloha musí mať priradený lead.");
  }

  if (!supabase) {
    const store = getDemoTasksStore();
    const existingIndex = store.findIndex((item) => item.id === id);

    if (existingIndex === -1) {
      throw new Error("Úloha nebola nájdená.");
    }

    const existing = store[existingIndex];
    const updatedTask: Task = {
      ...existing,
      leadId:
        typeof normalizedLeadId !== "undefined" ? normalizedLeadId : existing.leadId,
      assignedProfileId:
        typeof input.assignedProfileId !== "undefined"
          ? input.assignedProfileId
          : existing.assignedProfileId,
      title: typeof input.title !== "undefined" ? input.title : existing.title,
      description:
        typeof input.description !== "undefined"
          ? input.description
          : existing.description,
      status: typeof input.status !== "undefined" ? input.status : existing.status,
      priority:
        typeof input.priority !== "undefined" ? input.priority : existing.priority,
      dueAt: typeof input.dueAt !== "undefined" ? input.dueAt : existing.dueAt,
      completedAt:
        typeof input.completedAt !== "undefined"
          ? input.completedAt
          : existing.completedAt,
    };

    store[existingIndex] = updatedTask;
    return updatedTask;
  }

  const payload: any = {};

  if (typeof normalizedLeadId !== "undefined") payload.lead_id = normalizedLeadId;
  if (typeof input.assignedProfileId !== "undefined") payload.assigned_profile_id = input.assignedProfileId;
  if (typeof input.title !== "undefined") payload.title = input.title;
  if (typeof input.description !== "undefined") payload.description = input.description;
  if (typeof input.status !== "undefined") payload.status = input.status;
  if (typeof input.priority !== "undefined") payload.priority = input.priority;
  if (typeof input.dueAt !== "undefined") payload.due_at = input.dueAt;
  if (typeof input.completedAt !== "undefined") payload.completed_at = input.completedAt;

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    leadId: data.lead_id ?? null,
    assignedProfileId: data.assigned_profile_id ?? null,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "open",
    priority: data.priority ?? "medium",
    dueAt: data.due_at ?? null,
    completedAt: data.completed_at ?? null,
    createdAt: data.created_at,
  };
}

export async function deleteTask(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const store = getDemoTasksStore();
    const index = store.findIndex((item) => item.id === id);
    if (index !== -1) {
      store.splice(index, 1);
    }
    return { ok: true };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}