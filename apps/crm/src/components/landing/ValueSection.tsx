const items = [
  {
    title: "Režim AI asistenta",
    body: "AI ti pripraví presne čo povedať klientovi.",
  },
  {
    title: "Viac obchodov",
    body: "Prioritizuje dopyty a záujemcov s najvyššou šancou na kúpu.",
  },
  {
    title: "Plná kontrola",
    body: "Ty rozhoduješ. AI len pomáha.",
  },
];

export function ValueSection() {
  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition hover:border-cyan-500/30"
        >
          <h3 className="font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
        </div>
      ))}
    </section>
  );
}
