export const DEAD_LEAD_CLOSURE_REASON = "NO_RECORDED_CONTACT_90D";

export type DeadLeadCandidate = {
  createdAt: string;
  autoResponseSentAt: string | null;
  activityCount: number;
  status: string;
  source: string;
};

export function isDeadLeadCandidate(
  lead: DeadLeadCandidate,
  now = new Date()
) {
  const createdAt = new Date(lead.createdAt);
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return (
    Number.isFinite(createdAt.getTime()) &&
    createdAt < cutoff &&
    lead.autoResponseSentAt === null &&
    lead.activityCount === 0 &&
    lead.status === "Nový" &&
    lead.source === "realvia_import_smolko"
  );
}

export function getDeadLeadClosureUpdate() {
  return {
    closure_reason_code: DEAD_LEAD_CLOSURE_REASON,
    closure_note:
      "Za 90 dní žiadny zaznamenaný kontakt z našej strany. Nevieme, či má klient ešte záujem.",
  };
}