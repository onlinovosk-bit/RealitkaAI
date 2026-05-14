import Link from 'next/link';
import ModuleShell from '@/components/shared/module-shell';
import RealviaIntegrationAdminClient from '@/components/integrations/realvia-integration-admin-client';
import { requireRole } from '@/lib/permissions';
import { DB_ROLES, PERMISSION_GROUPS } from '@/lib/role-config';

/** Canonical ops URL: /integrations/realvia (inside dashboard shell). */

export default async function RealviaIntegrationPage() {
  await requireRole([...PERMISSION_GROUPS.FULL_ADMIN, DB_ROLES.ADMIN]);

  return (
    <ModuleShell
      title="Realvia"
      description="Webhook logy, fronta spracovania a kontrola schémy (owner / manager / founder / legacy admin)."
    >
      <p className="mb-4 text-sm text-blue-100/90">
        <Link href="/integrations" className="underline underline-offset-2 hover:text-white">
          ← Späť na Integrations
        </Link>
      </p>

      <RealviaIntegrationAdminClient />
    </ModuleShell>
  );
}
