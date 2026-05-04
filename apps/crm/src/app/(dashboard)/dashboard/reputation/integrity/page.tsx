import { ShieldCheck, Lock } from "lucide-react";

export default function IntegrityPage() {
  return (
    <div className="min-h-screen bg-[#010103] p-10">
      <div className="mb-8">
        <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Agent Integrity Monitor</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Zabezpečenie a oprávnenia tímu
        </p>
      </div>

      <div className="rounded-[2rem] border border-yellow-500/20 bg-yellow-500/5 p-8 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2">
            <ShieldCheck className="text-yellow-500" size={18} />
          </div>
          <Lock className="text-yellow-500" />
          <p className="text-sm font-medium italic text-yellow-100">
            Tento modul je súčasťou balíka Protocol Authority. Prístup k riadeniu dát a prevencii úniku
            informácií je aktívny.
          </p>
        </div>
      </div>
    </div>
  );
}
