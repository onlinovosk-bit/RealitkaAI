import { Code2, Database, Globe, Key } from "lucide-react";
import DeveloperRequestKeyCard from "./request-key-card";

export default function DeveloperDocsPage() {
  return (
    <div className="min-h-screen bg-[#010103] font-mono text-slate-300">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 p-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Code2 className="text-blue-500" />
          <h1 className="text-xl font-bold uppercase tracking-tighter text-white">
            Revolis Data API <span className="text-[10px] text-blue-500">v1.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black uppercase">Systems Operational</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 p-12 md:grid-cols-3">
        <div className="col-span-2 space-y-12">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
              <Database size={18} className="text-blue-500" /> GET /market-pulse
            </h2>
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-sm leading-relaxed">
              <p className="mb-4 text-slate-500">
                // Returns anonymized real-time price data for SK regions
              </p>
              <code className="text-blue-400">
                curl -X GET "https://api.revolis.ai/v1/market-pulse?city=Presov"
                <br />
                &nbsp;&nbsp;-H "x-api-key: YOUR_KEY"
              </code>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
              <Key size={18} className="text-blue-500" /> Webhook: LV Alerts
            </h2>
            <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-sm italic">
              "Poisťovne a banky môžu odoberať v reálnom čase zmeny na listoch vlastníctva pre
              svoje hypotekárne portfóliá."
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <DeveloperRequestKeyCard />
        </div>
      </div>
    </div>
  );
}
