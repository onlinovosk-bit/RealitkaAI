"use client";

import { useEffect, useState } from "react";
import type { ValuationPageContext } from "@/lib/valuation/tenant";
import {
  getOrAssignValuationAbTest,
  type ValuationAbAssignment,
} from "@/lib/valuation/ab-test";
import { ValuationWidgetForm } from "@/components/valuation/ValuationWidgetForm";

type Props = {
  tenant: ValuationPageContext;
};

export function ValuationWidgetShell({ tenant }: Props) {
  const [assignment, setAssignment] = useState<ValuationAbAssignment | null>(null);

  useEffect(() => {
    setAssignment(getOrAssignValuationAbTest());
  }, []);

  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl p-8 text-center text-sm opacity-70">
        Načítavam formulár…
      </div>
    );
  }

  return (
    <ValuationWidgetForm
      tenant={tenant}
      abVariant={assignment.variant}
      sessionId={assignment.sessionId}
    />
  );
}
