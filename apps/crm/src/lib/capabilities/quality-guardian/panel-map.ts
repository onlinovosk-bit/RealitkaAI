import type { ListingCompletenessScore } from "@/lib/capabilities/listing-score";
import type { GeneratedListing } from "@/lib/capabilities/listing-generator";
import type { GuardianReviewResult } from "@/lib/capabilities/quality-guardian/types";

export type GuardianPanelFlag = {
  id: string;
  severity: "blocking" | "warning";
  label: string;
  message: string;
};

export type GuardianPanelPassItem = {
  id: string;
  label: string;
  detail?: string;
};

export type GuardianPanelView = {
  hasOutput: boolean;
  completenessPercent: number | null;
  fieldsChecked: number;
  fieldsTotal: number;
  passItems: GuardianPanelPassItem[];
  flags: GuardianPanelFlag[];
  publishBlocked: boolean;
};

const REASON_LABELS: Record<string, { label: string; message: string; severity: "blocking" | "warning" }> = {
  missing_headline: {
    label: "Chýba nadpis",
    message: "Vygenerovaný inzerát nemá nadpis — doplňte alebo regenerujte.",
    severity: "blocking",
  },
  missing_body: {
    label: "Chýba text",
    message: "Vygenerovaný inzerát nemá popis — doplňte alebo regenerujte.",
    severity: "blocking",
  },
  brand_color_off_palette: {
    label: "Farba mimo palety",
    message: "Použitá farba nezodpovedá brand kitu agentúry.",
    severity: "warning",
  },
};

function mapReasonToFlag(reason: string): GuardianPanelFlag {
  const preset = REASON_LABELS[reason];
  if (preset) {
    return { id: reason, ...preset };
  }

  if (reason.startsWith("free_text_area_mismatch:")) {
    const claimed = reason.slice("free_text_area_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Rozpor v ploche",
      message: `V texte je uvedená plocha ${claimed} m², ktorá nezodpovedá poliam ponuky (úžitková / zastavaná / pozemok). Upravte pole plochy alebo text popisu.`,
    };
  }

  if (reason.startsWith("free_text_price_mismatch:")) {
    const claimed = reason.slice("free_text_price_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Rozpor v cene",
      message: `V texte je uvedená cena ${claimed} €, ktorá nezodpovedá cene v ponuke.`,
    };
  }

  if (reason.startsWith("invented_fact_field:")) {
    const field = reason.slice("invented_fact_field:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Vymyslený údaj",
      message: `AI text obsahuje pole „${field}", ktoré nie je v dátach ponuky.`,
    };
  }

  if (reason.startsWith("fact_mismatch:")) {
    const field = reason.slice("fact_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Nekonzistentný údaj",
      message: `Hodnota poľa „${field}" v texte nezodpovedá údajom ponuky.`,
    };
  }

  return {
    id: reason,
    severity: "blocking",
    label: "Kontrola kvality",
    message: reason,
  };
}

function uniqueReasons(results: GuardianReviewResult[]): string[] {
  const seen = new Set<string>();
  for (const result of results) {
    for (const reason of result.reasons) {
      seen.add(reason);
    }
  }
  return [...seen];
}

/** Map existing Guardian + completeness output to customer-visible panel shape. No new scoring. */
export function buildGuardianPanelView(input: {
  completeness: ListingCompletenessScore | null;
  listing: GeneratedListing | null;
}): GuardianPanelView {
  if (!input.completeness && !input.listing) {
    return {
      hasOutput: false,
      completenessPercent: null,
      fieldsChecked: 0,
      fieldsTotal: 0,
      passItems: [],
      flags: [],
      publishBlocked: false,
    };
  }

  const completeness = input.completeness;
  const listing = input.listing;
  const guardianResults = [
    ...(listing ? [listing.guardian] : []),
    ...(completeness ? [completeness.guardian] : []),
  ];

  const flags = uniqueReasons(guardianResults).map(mapReasonToFlag);
  const passItems: GuardianPanelPassItem[] =
    completeness?.fields.filter((f) => f.present).map((f) => ({
      id: f.key,
      label: f.label,
      detail: f.detail,
    })) ?? [];

  return {
    hasOutput: Boolean(completeness || listing),
    completenessPercent: completeness?.scorePercent ?? null,
    fieldsChecked: completeness?.filledCount ?? 0,
    fieldsTotal: completeness?.totalCount ?? 0,
    passItems,
    flags,
    publishBlocked: flags.some((f) => f.severity === "blocking"),
  };
}

export function isGuardianPublishEnabled(view: GuardianPanelView): boolean {
  return view.hasOutput && !view.publishBlocked;
}
