export default function ForecastKpis({
  cards,
}: {
  cards: Array<{
    title: string;
    value: string | number;
    subtitle: string;
  }>;
}) {
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
