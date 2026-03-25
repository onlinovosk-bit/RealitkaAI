export default function TasksOverview({
  openTasks,
  inProgressTasks,
  doneTasks,
  highPriorityTasks,
}: {
  openTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  highPriorityTasks: number;
}) {
  const cards = [
    { title: "Open", value: openTasks },
    { title: "In progress", value: inProgressTasks },
    { title: "Done", value: doneTasks },
    { title: "High priority", value: highPriorityTasks },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Úlohy overview</h2>
        <p className="text-sm text-gray-500">
          Prehľad operatívy a follow-up úloh.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
