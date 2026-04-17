import ModuleShell from "@/components/shared/module-shell";
import NexusAiChatSettingsClient from "@/components/settings/nexus-ai-chat-settings-client";
import { AI_ASSISTANT_NAME, AI_ASSISTANT_CHAT_LABEL } from "@/lib/ai-brand";
import { requireRole } from "@/lib/permissions";

export default async function NexusAiChatSettingsPage() {
  await requireRole(["owner", "manager", "agent"]);

  return (
    <ModuleShell
      title={`Umelá inteligencia — ${AI_ASSISTANT_CHAT_LABEL}`}
      description={`Nastavenie štýlu odpovedí ${AI_ASSISTANT_NAME} pre detail príležitosti.`}
    >
      <NexusAiChatSettingsClient />
    </ModuleShell>
  );
}
