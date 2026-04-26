export default function IntegrityPage() {
  return (
    <div className="min-h-screen bg-[#010103] p-10 text-white">
      <h2 className="mb-2 text-2xl font-black italic uppercase text-white">Agent Integrity Monitor</h2>
      <p className="mb-10 text-[10px] uppercase tracking-widest text-slate-500">
        Sprava pristupov a ochrana dat RK
      </p>

      <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-8">
        <p className="font-mono text-xs text-blue-400">
          System autorizacie je teraz riadeny cez Protocol Authority engine.
        </p>
      </div>
    </div>
  );
}
