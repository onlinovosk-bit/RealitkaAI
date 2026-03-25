export default function TeamKpis({
  totalUsers,
  totalTeams,
  totalLeads,
  assignedLeads,
}: {
  totalUsers: number;
  totalTeams: number;
  totalLeads: number;
  assignedLeads: number;
}) {
  const cards = [
    {
      title: "Používatelia",
      value: totalUsers,
      subtitle: "Aktívni ľudia v systéme",
    },
    {
      title: "Tímy",
      value: totalTeams,
      subtitle: "Organizačné jednotky realitky",
    },
    {
      title: "Všetky leady",
      value: totalLeads,
      subtitle: "Počet leadov v CRM",
    },
    {
      title: "Priradené leady",
      value: assignedLeads,
      subtitle: "Leady s konkrétnym agentom",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500">{card.title}</p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">{card.value}</h2>
          <p className="mt-2 text-sm text-gray-500">{card.subtitle}</p>
        </div>
      ))}
    </section>
  );
}
