"use client";

import ProofHero from "./ProofHero";
import QuestionStepper, { useProofSubmit } from "./QuestionStepper";
import LoadingAnalysis from "./LoadingAnalysis";
import ReportLayout from "./ReportLayout";

export default function ProofFunnelClient() {
  const { phase, report, submitting, error, submit, finishLoading } = useProofSubmit();

  return (
    <div className="pb-16">
      <ProofHero />
      <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6">
        {phase === "questions" && (
          <QuestionStepper onSubmit={submit} submitting={submitting} error={error} />
        )}
        {phase === "loading" && <LoadingAnalysis onDone={finishLoading} />}
        {phase === "report" && report && <ReportLayout report={report} />}
      </div>
    </div>
  );
}
