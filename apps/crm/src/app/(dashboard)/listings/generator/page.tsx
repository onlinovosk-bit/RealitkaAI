import ModuleShell from "@/components/shared/module-shell";
import { requireRole } from "@/lib/permissions";
import ListingGeneratorForm from "./ListingGeneratorForm";

export default async function ListingGeneratorPage() {
  await requireRole(["owner", "manager", "agent"]);

  return (
    <ModuleShell
      title="Generátor inzerátov"
      description="AI texty pre portály a sociálne siete z parametrov nehnuteľnosti. 2 kredity za generovanie."
    >
      <ListingGeneratorForm />
    </ModuleShell>
  );
}
