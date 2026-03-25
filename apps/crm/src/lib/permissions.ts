import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth";

export async function requireRole(allowedRoles: string[]) {
  await requireUser();
  const profile = await getCurrentProfile();

  // If profile is missing, treat authenticated user as agent fallback.
  // This keeps non-admin routes usable while still protecting manager/owner areas.
  const normalizedRole = (profile?.role ?? "agent").trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((role) => role.trim().toLowerCase());

  if (!normalizedAllowedRoles.includes(normalizedRole)) {
    redirect("/forbidden");
  }

  return profile;
}
