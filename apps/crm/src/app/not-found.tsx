import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#010103] p-6 text-center">
      <div className="mb-8 h-1 w-16 animate-pulse bg-blue-600" />
      <h2 className="mb-2 text-2xl font-black italic tracking-tighter text-white">PRERUSENY SIGNAL</h2>
      <p className="mb-8 text-[10px] uppercase tracking-widest text-slate-500">
        Pozadovana zona nie je v dosahu radaru.
      </p>
      <Link
        href="/dashboard"
        className="border border-blue-500/20 bg-blue-600/10 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-600/20"
      >
        NAVRAT DO COMMAND CENTRA
      </Link>
    </div>
  );
}
