import { requireRole } from "@/lib/permissions";

export default async function TeamProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner", "manager"]);
  return <>{children}</>;
}
