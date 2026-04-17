export function FearReductionSection() {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 md:p-10">
      <h2 className="text-2xl font-bold text-white">Revolis.AI ťa nenahrádza</h2>
      <ul className="mt-5 space-y-3 text-slate-300">
        <li className="flex gap-2">
          <span className="text-emerald-400">✔</span>
          <span>AI robí nudné veci</span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✔</span>
          <span>Ty robíš rozhodnutia</span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✔</span>
          <span>Ty uzatváraš obchody</span>
        </li>
      </ul>
    </section>
  );
}
