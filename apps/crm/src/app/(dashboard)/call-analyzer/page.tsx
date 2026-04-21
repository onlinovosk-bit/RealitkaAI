import CallAnalyzerClient from "@/components/call-analyzer/call-analyzer-client";

export default function CallAnalyzerPage() {
  return (
    <main className="p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Analyzátor hovorov</h1>
          <p className="mt-1 text-sm text-slate-400">
            Vlož prepis hovoru a AI ti dá spätnú väzbu — sentiment, kľúčové témy a odporúčaný ďalší krok.
          </p>
        </div>
        <CallAnalyzerClient />
      </div>
    </main>
  );
}
