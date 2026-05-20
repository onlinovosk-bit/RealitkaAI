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
      className: "border-slate-200 bg-white text-slate-950",
      labelClassName: "text-slate-500",
    },
    {
      title: "Tímy",
      value: totalTeams,
      subtitle: "Organizačné jednotky realitky",
      className: "border-blue-100 bg-blue-50 text-blue-800",
      labelClassName: "text-blue-700",
    },
    {
      title: "Všetky leady",
      value: totalLeads,
      subtitle: "Počet leadov v CRM",
      className: "border-amber-100 bg-amber-50 text-amber-800",
      labelClassName: "text-amber-700",
    },
    {
      title: "Priradené leady",
      value: assignedLeads,
      subtitle: "Leady s konkrétnym agentom",
      className: "border-emerald-100 bg-emerald-50 text-emerald-800",
      labelClassName: "text-emerald-700",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-2xl border p-5 shadow-sm shadow-blue-950/5 ${card.className}`}
        >
          <p className={`text-sm ${card.labelClassName}`}>{card.title}</p>
          <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
          <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
        </div>
      ))}
    </section>
  );
}
