"use client";

export function AIAssistBanner() {
  return (
    <article className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 p-5 shadow-[0_0_26px_rgba(6,182,212,0.18)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">AI Assist</p>
      <h2 className="mt-2 text-xl font-bold text-white">Zrýchli rozhodovanie nad leadmi</h2>
      <p className="mt-2 max-w-xl text-sm text-cyan-100/85">
        Asistent navrhne prioritné ďalšie kroky, zhrnie riziká a pomôže ti pripraviť sa na ďalší call.
      </p>
    </article>
  );
}
