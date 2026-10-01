import ModuleShell from "@/components/shared/module-shell";
import { FollowupDraftsPanel } from "@/components/followup/FollowupDraftsPanel";

export default function FollowupPage() {
  return (
    <ModuleShell
      title="Follow-up agent (Loop 1)"
      description="Náhľad AI draftov pred odoslaním. Režim draft_only — broker schvaľuje pred Guardian 5/5."
    >
      <FollowupDraftsPanel />
    </ModuleShell>
  );
}
