import type { Task } from "@/lib/tasks-store";

type LeadOption = {
  id: string;
  name: string;
};

type ProfileOption = {
  id: string;
  fullName: string;
};

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "done":
      return "bg-green-100 text-green-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function TasksTable({
  tasks,
  leads,
  profiles,
  onEdit,
}: {
  tasks: Task[];
  leads: LeadOption[];
  profiles: ProfileOption[];
  onEdit?: (task: Task) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Úlohy</h2>
        <p className="text-sm text-gray-500">
          Denná operatíva maklérov a follow-up agenda.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Úloha</th>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Agent</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Priorita</th>
              <th className="px-5 py-3 font-medium">Deadline</th>
              <th className="px-5 py-3 font-medium text-right">Akcia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const lead = leads.find((item) => item.id === task.leadId);
              const profile = profiles.find((item) => item.id === task.assignedProfileId);

              return (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{task.title}</div>
                    <div className="text-xs text-gray-500">{task.description}</div>
                  </td>

                  <td className="px-5 py-4 text-gray-700">{lead?.name ?? "-"}</td>
                  <td className="px-5 py-4 text-gray-700">{profile?.fullName ?? "-"}</td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(task.status)}`}>
                      {task.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {task.dueAt ? new Date(task.dueAt).toLocaleString("sk-SK") : "-"}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit?.(task)}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Detail / edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tasks.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú vytvorené žiadne úlohy.
        </div>
      )}
    </div>
  );
}
