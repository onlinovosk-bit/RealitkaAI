// scheduler.ts
// Simple in-memory job scheduler for outreach automation (for demo/dev only)

export type ScheduledJob = {
  runAt: number; // timestamp in ms
  job: () => Promise<void>;
};

const scheduledJobs: ScheduledJob[] = [];

export function scheduleJob({ runAt, job }: ScheduledJob) {
  const delay = Math.max(0, runAt - Date.now());
  setTimeout(async () => {
    await job();
  }, delay);
  scheduledJobs.push({ runAt, job });
}

export function getScheduledJobs(): ScheduledJob[] {
  return scheduledJobs;
}
