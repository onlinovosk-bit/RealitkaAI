import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import TaskCreateForm from "@/components/tasks/task-create-form";
import TasksWorkspace from "@/components/tasks/tasks-workspace";
import { listTasks } from "@/lib/tasks-store";
import { listLeads } from "@/lib/leads-store";
import { listProfiles } from "@/lib/team-store";
import { safeServerAction } from "@/lib/safe-action";

export default async function TasksPage() {
  const result = await safeServerAction(
    async () => {
      const [tasks, leads, profiles] = await Promise.all([
        listTasks(),
        listLeads(),
        listProfiles(),
      ]);

      return { tasks, leads, profiles };
    },
    "Nepodarilo sa načítať úlohy."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title="Úlohy"
        description="Denná operatíva, follow-up úlohy a vykonávanie odporúčaní v praxi."
      >
        <ErrorState
          title="Úlohy sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const { tasks, leads, profiles } = result.data;

  const openTasks = tasks.filter((item) => item.status === "open").length;
  const inProgressTasks = tasks.filter((item) => item.status === "in_progress").length;
  const doneTasks = tasks.filter((item) => item.status === "done").length;
  const highPriority = tasks.filter((item) => item.priority === "high").length;

  return (
    <ModuleShell
      title="Úlohy"
      description="Denná operatíva, follow-up úlohy a vykonávanie odporúčaní v praxi."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-600">Otvorené úlohy</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-900">{openTasks}</h2>
        </div>

        <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 shadow-sm">
          <p className="text-sm text-yellow-600">Rozpracované</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-900">{inProgressTasks}</h2>
        </div>

        <div className="rounded-2xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <p className="text-sm text-green-600">Dokončené</p>
          <h2 className="mt-2 text-3xl font-bold text-green-900">{doneTasks}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-600">Vysoká priorita</p>
          <h2 className="mt-2 text-3xl font-bold text-red-900">{highPriority}</h2>
        </div>
      </section>

      <section className="mb-6">
        <TaskCreateForm
          leads={leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
          }))}
          profiles={profiles.map((profile) => ({
            id: profile.id,
            fullName: profile.fullName,
          }))}
        />
      </section>

      {tasks.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne úlohy"
          description="Vytvor prvú úlohu cez formulár vyššie."
        />
      ) : (
        <TasksWorkspace
          tasks={tasks}
          leads={leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
          }))}
          profiles={profiles.map((profile) => ({
            id: profile.id,
            fullName: profile.fullName,
          }))}
        />
      )}
    </ModuleShell>
  );
}
