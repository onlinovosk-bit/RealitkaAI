import { isCeoCommandOwner, type CeoCommandProfile } from "@/lib/ceo-command/access";

export type InboxProfile = CeoCommandProfile & {
  id?: string | null;
};

/** Owner / director — agency-wide inbox including ceo_command. */
export function isInboxOwner(profile: InboxProfile | null | undefined): boolean {
  return isCeoCommandOwner(profile);
}

export type RoutineNotificationLike = {
  profile_id: string | null;
  type: string;
};

/** Application-layer filter on top of RLS (agents must not see agency-wide rows). */
export function canViewInboxNotification(
  profile: InboxProfile | null | undefined,
  row: RoutineNotificationLike,
): boolean {
  if (!profile?.id) return false;
  if (row.type === "ceo_command") {
    return isInboxOwner(profile);
  }
  if (isInboxOwner(profile)) {
    return true;
  }
  return row.profile_id === profile.id;
}
