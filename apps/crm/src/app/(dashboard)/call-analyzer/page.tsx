import ModuleShell from "@/components/shared/module-shell";
import CallAnalyzerClient from "@/components/call-analyzer/call-analyzer-client";

export default function CallAnalyzerPage() {
  return (
    <ModuleShell
      title="AI Call Analyzer"
      description="Prepíš alebo nahraj hovor — skóre, silné stránky, slabiny a coaching tipy."
    >
      <CallAnalyzerClient />
    </ModuleShell>
  );
}
