import { requireRole } from "@/lib/permissions";

export default async function SettingsProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner", "manager", "agent"]);
  return <>{children}</>;
}
