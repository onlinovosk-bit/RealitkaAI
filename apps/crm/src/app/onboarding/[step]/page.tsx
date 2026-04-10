import { notFound } from "next/navigation";
import { STEP_SLUGS } from "../config";
import Step1 from "../steps/Step1";
import Step2 from "../steps/Step2";
import Step3 from "../steps/Step3";
import Step4 from "../steps/Step4";
import Step5 from "../steps/Step5";
import Step6 from "../steps/Step6";
import Step7 from "../steps/Step7";
import Step8 from "../steps/Step8";
import Step9 from "../steps/Step9";

type StepComponent = React.ComponentType<{ slug: string }>;

const STEP_MAP: Record<string, StepComponent> = {
  "step-1-vitaj":       Step1,
  "step-2-realitka":    Step2,
  "step-3-profil":      Step3,
  "step-4-ai-asistent": Step4,
  "step-5-import":      Step5,
  "step-6-pipeline":    Step6,
  "step-7-prepojenia":  Step7,
  "step-8-ciele":       Step8,
  "step-9-hotovo":      Step9,
};

export function generateStaticParams() {
  return STEP_SLUGS.map(slug => ({ step: slug }));
}

export default async function StepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const Component = STEP_MAP[step];
  if (!Component) notFound();
  return <Component slug={step} />;
}
