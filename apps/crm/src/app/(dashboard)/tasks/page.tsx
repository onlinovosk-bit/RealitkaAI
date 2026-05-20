import ModuleShell from "@/components/shared/module-shell";
import EmptyState from "@/components/shared/empty-state";
import ErrorState from "@/components/shared/error-state";
import TaskCreateForm from "@/components/tasks/task-create-form";
import TasksWorkspace from "@/components/tasks/tasks-workspace";
import { listTasks } from "@/lib/tasks-store";
import { listLeads } from "@/lib/leads-store";
import { listProfiles } from "@/lib/team-store";
import { safeServerAction } from "@/lib/safe-action";
import Link from "next/link";

const statCards = [
  {
    href: "/tasks?filter=open",
    label: "Otvorené úlohy",
    tone: "border-blue-200 bg-blue-50/80 text-blue-700 hover:border-blue-300",
    valueClass: "text-blue-950",
  },
  {
    label: "Rozpracované",
    tone: "border-amber-200 bg-amber-50/80 text-amber-700",
    valueClass: "text-amber-950",
  },
  {
    href: "/tasks?filter=done",
    label: "Dokončené",
    tone: "border-green-200 bg-green-50/80 text-green-700 hover:border-green-300",
    valueClass: "text-green-950",
  },
  {
    href: "/tasks?filter=high",
    label: "Vysoká priorita",
    tone: "border-red-200 bg-red-50/80 text-red-700 hover:border-red-300",
    valueClass: "text-red-950",
  },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filterParam = resolvedSearchParams?.filter;

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
        description="Denná operatíva, následné úlohy a vykonávanie odporúčaní v praxi."
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
  const filteredTasks = tasks.filter((item) => {
    if (filterParam === "open") return item.status === "open";
    if (filterParam === "done") return item.status === "done";
    if (filterParam === "high") return item.priority === "high";
    return true;
  });

  return (
    <ModuleShell
      title="Úlohy"
      description="Komu volať ako prvému, čo dokončiť dnes a ktoré úlohy blokujú províziu."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => {
          const value = [openTasks, inProgressTasks, doneTasks, highPriority][index];
          const className = `rounded-2xl border p-5 shadow-sm transition ${card.tone}`;
          const content = (
            <>
              <p className="text-sm font-medium">{card.label}</p>
              <h2 className={`mt-2 text-3xl font-bold ${card.valueClass}`}>{value}</h2>
            </>
          );

          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
            >
              {content}
            </Link>
          ) : (
            <div key={card.label} className={className}>
              {content}
            </div>
          );
        })}
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

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="Zatiaľ nemáš žiadne úlohy"
          description="Vytvor prvú úlohu cez formulár vyššie."
        />
      ) : (
        <TasksWorkspace
          tasks={filteredTasks}
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
