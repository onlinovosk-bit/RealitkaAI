import ModuleShell from "@/components/shared/module-shell";
import NexusAiChatSettingsClient from "@/components/settings/nexus-ai-chat-settings-client";
import { requireRole } from "@/lib/permissions";

export default async function NexusAiChatSettingsPage() {
  await requireRole(["owner", "manager", "agent"]);

  return (
    <ModuleShell
      title="NEXUS AI Chat"
      description="Nastavenie štýlu odpovedí NEXUS AI pre detail príležitosti."
    >
      <NexusAiChatSettingsClient />
    </ModuleShell>
  );
}
