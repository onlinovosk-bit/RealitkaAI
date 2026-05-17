import type { SupabaseClient } from "@supabase/supabase-js";

export type EnqueueInput = {
  jobType: string;
  payload: Record<string, unknown>;
  maxRetries?: number;
  runAfter?: string;
};

export async function enqueueAiJob(
  admin: SupabaseClient,
  input: EnqueueInput,
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await admin
    .from("ai_jobs")
    .insert({
      job_type: input.jobType,
      payload: input.payload,
      status: "pending",
      max_retries: input.maxRetries ?? 5,
      run_after: input.runAfter ?? new Date().toISOString(),
      retry_count: 0,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { error: error?.message ?? "enqueue failed" };
  }
  return { id: data.id as string };
}
