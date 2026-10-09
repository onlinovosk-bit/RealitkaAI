import type { DealHealthIssue } from "@/lib/forecasting-store";

export type ForecastRiskSignal = {
  leadId: string;
  leadName: string;
  /** 0 keď riskKnown=false — nikdy nezobrazuj ako sumu. */
  riskEur: number;
  /** false = rozpočet leadu chýba, riziko v EUR je nevypočítané. */
  riskKnown: boolean;
  probabilityPercent: number;
  note: string;
  kind: DealHealthIssue["kind"];
};

export type ForecastRiskSummary = {
  gapEur: number;
  atRiskCount: number;
  atRiskValueEur: number;
  /** Počet signálov, ktorým chýba rozpočet (riziko v EUR nevypočítané). */
  unknownValueCount: number;
  headline: string;
  subline: string;
  signals: ForecastRiskSignal[];
};

const DEFAULT_TARGET_PIPELINE = 500_000;
const DEFAULT_TARGET_CLOSED = 3;

function formatEur(value: number): string {
  return `€${Math.round(value).toLocaleString("sk-SK")}`;
}

export function buildForecastRiskSummary(input: {
  totalLeads: number;
  expectedPipelineValue: number;
  expectedClosedDeals: number;
  dealHealth: DealHealthIssue[];
  targetPipelineValue?: number;
  targetClosedDeals?: number;
}): ForecastRiskSummary {
  if (input.totalLeads <= 0) {
    return {
      gapEur: 0,
      atRiskCount: 0,
      atRiskValueEur: 0,
      unknownValueCount: 0,
      headline: "Zatiaľ nie sú dáta na predikciu rizika",
      subline:
        "Forecast a riziká mesiaca sa počítajú z príležitostí v CRM — po importe alebo pridaní leadov sa zobrazia reálne signály.",
      signals: [],
    };
  }

  const targetPipeline = input.targetPipelineValue ?? DEFAULT_TARGET_PIPELINE;
  const targetClosed = input.targetClosedDeals ?? DEFAULT_TARGET_CLOSED;
  const gapEur = Math.max(0, targetPipeline - input.expectedPipelineValue);
  const closedGap = Math.max(0, targetClosed - input.expectedClosedDeals);

  const signals: ForecastRiskSignal[] = input.dealHealth.slice(0, 3).map((issue) => {
    const value = issue.expectedDealValueEur;
    const riskKnown = typeof value === "number" && Number.isFinite(value) && value > 0;
    return {
      leadId: issue.leadId,
      leadName: issue.leadName,
      riskEur: riskKnown ? Math.round((issue.probabilityPercent / 100) * value) : 0,
      riskKnown,
      probabilityPercent: issue.probabilityPercent,
      note: riskKnown ? issue.note : `${issue.note} · riziko v EUR nevypočítané — chýba rozpočet`,
      kind: issue.kind,
    };
  });

  const atRiskValueEur = signals.reduce((sum, s) => sum + (s.riskKnown ? s.riskEur : 0), 0);
  const unknownValueCount = signals.filter((s) => !s.riskKnown).length;
  const atRiskCount = input.dealHealth.length;

  let headline: string;
  let subline: string;

  if (atRiskCount > 0 && gapEur > 0) {
    headline = `${formatEur(gapEur)} riziko — ${atRiskCount} deal${atRiskCount === 1 ? "" : "y"} bez follow-upu`;
    subline = `${Math.round(closedGap)} chýba k cieľu uzavretí · ochráň pipeline hodnotu tento mesiac`;
  } else if (atRiskCount > 0) {
    headline = `${atRiskCount} deal${atRiskCount === 1 ? "" : "y"} ohrozujú mesiac`;
    subline = "Rieš follow-upy a termíny skôr než stratíš momentum";
  } else if (gapEur > 0) {
    headline = `${formatEur(gapEur)} pod cieľom pipeline`;
    subline = "Posuň horúce leady do ponuky a obhliadky";
  } else {
    headline = "Pipeline drží cieľ";
    subline = "Sústreď sa na top 3 obchody s najvyššou pravdepodobnosťou";
  }

  return {
    gapEur,
    atRiskCount,
    atRiskValueEur,
    unknownValueCount,
    headline,
    subline,
    signals,
  };
}
