/**
 * Reference repository — Revolis CRM data access layer.
 * Domain interface + Supabase implementation with agency_id scoping.
 * NOT imported by the app; for skill documentation only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Domain types (would live in src/domain/leads/repositories/) ───

export interface TaskSummary {
  id: string;
  title: string;
  status: "open" | "done" | "cancelled";
  agencyId: string;
  assignedProfileId: string | null;
  dueAt: string | null;
  createdAt: string;
}

export interface TaskFilters {
  status?: TaskSummary["status"];
  assignedProfileId?: string;
  limit?: number;
  offset?: number;
}

export interface TasksRepository {
  findById(id: string, agencyId: string): Promise<TaskSummary | null>;
  findByAgencyId(agencyId: string, filters?: TaskFilters): Promise<TaskSummary[]>;
  countOpen(agencyId: string): Promise<number>;
}

// ── Supabase row type (snake_case matches DB) ─────────────────────

interface TaskRow {
  id: string;
  title: string;
  status: string;
  agency_id: string;
  assigned_profile_id: string | null;
  due_at: string | null;
  created_at: string;
}

const TASK_COLUMNS =
  "id,title,status,agency_id,assigned_profile_id,due_at,created_at" as const;

function isTaskStatus(value: string): value is TaskSummary["status"] {
  return value === "open" || value === "done" || value === "cancelled";
}

function mapTaskRow(row: TaskRow): TaskSummary {
  const status = isTaskStatus(row.status) ? row.status : "open";
  return {
    id: row.id,
    title: row.title,
    status,
    agencyId: row.agency_id,
    assignedProfileId: row.assigned_profile_id,
    dueAt: row.due_at,
    createdAt: row.created_at,
  };
}

// ── Implementation (would live in src/infra/db/repositories/) ─────

export class SupabaseTasksRepository implements TasksRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string, agencyId: string): Promise<TaskSummary | null> {
    const { data, error } = await this.supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseTasksRepository] findById: ${error.message}`);
    }

    if (!data) return null;
    return mapTaskRow(data as TaskRow);
  }

  async findByAgencyId(
    agencyId: string,
    filters: TaskFilters = {}
  ): Promise<TaskSummary[]> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    let query = this.supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.assignedProfileId) {
      query = query.eq("assigned_profile_id", filters.assignedProfileId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[SupabaseTasksRepository] findByAgencyId: ${error.message}`);
    }

    return (data ?? []).map((row) => mapTaskRow(row as TaskRow));
  }

  async countOpen(agencyId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "open");

    if (error) {
      throw new Error(`[SupabaseTasksRepository] countOpen: ${error.message}`);
    }

    return count ?? 0;
  }
}
