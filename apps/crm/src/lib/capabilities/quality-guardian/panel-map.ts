import type { CompletenessFieldKey, ListingCompletenessScore } from "@/lib/capabilities/listing-score";
import type { GeneratedListing } from "@/lib/capabilities/listing-generator";
import type { GuardianReviewResult } from "@/lib/capabilities/quality-guardian/types";

export type GuardianPanelFlag = {
  id: string;
  severity: "blocking" | "warning";
  label: string;
  message: string;
  actionLabel: string;
};

export type GuardianPanelPassItem = {
  id: string;
  label: string;
  detail?: string;
};

export type GuardianPanelTodoItem = {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
};

export type GuardianPanelStatus = "ready" | "needs_data" | "blocked";

export type GuardianPanelView = {
  hasOutput: boolean;
  status: GuardianPanelStatus;
  statusLabel: string;
  nextStepSummary: string;
  completenessPercent: number | null;
  fieldsChecked: number;
  fieldsTotal: number;
  passItems: GuardianPanelPassItem[];
  todoItems: GuardianPanelTodoItem[];
  flags: GuardianPanelFlag[];
  publishBlocked: boolean;
};

const FIELD_ACTIONS: Record<CompletenessFieldKey, string> = {
  photos: "Pridajte aspoň jednu fotku k ponuke",
  video: "Doplňte video v Realvii alebo v ponuke",
  virtual_tour: "Pridajte virtuálnu prehliadku",
  description: "Rozšírte popis nehnuteľnosti (min. 40 znakov)",
  price: "Zadajte predajnú cenu",
  gps: "Doplňte GPS súradnice ponuky",
  energy_cert: "Doplňte energetický certifikát",
  category: "Vyberte typ nehnuteľnosti",
  location: "Doplňte lokalitu ponuky",
};

const STATUS_LABELS: Record<GuardianPanelStatus, string> = {
  ready: "Pripravené na kontrolu textu",
  needs_data: "Treba doplniť údaje",
  blocked: "Treba opraviť rozpor v údajoch",
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
    return {
      id: reason,
      ...preset,
      actionLabel: "Upravte ponuku alebo nechajte regenerovať text inzerátu",
    };
  }

  if (reason.startsWith("free_text_area_mismatch:")) {
    const claimed = reason.slice("free_text_area_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Rozpor v ploche",
      message: `V texte je ${claimed} m², ale v poliach ponuky to nesedí (úžitková / zastavaná / pozemok).`,
      actionLabel: "Upravte plochu alebo popis v ponuke",
    };
  }

  if (reason.startsWith("free_text_price_mismatch:")) {
    const claimed = reason.slice("free_text_price_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Rozpor v cene",
      message: `V texte je cena ${claimed} €, ale v ponuke je iná hodnota.`,
      actionLabel: "Zosúlaďte cenu v ponuke a v texte",
    };
  }

  if (reason.startsWith("invented_fact_field:")) {
    const field = reason.slice("invented_fact_field:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Vymyslený údaj",
      message: `AI text obsahuje údaj „${field}", ktorý v ponuke nemáte.`,
      actionLabel: "Odstráňte z textu alebo doplňte údaj v ponuke",
    };
  }

  if (reason.startsWith("fact_mismatch:")) {
    const field = reason.slice("fact_mismatch:".length);
    return {
      id: reason,
      severity: "blocking",
      label: "Nekonzistentný údaj",
      message: `Pole „${field}" v texte nezodpovedá údajom ponuky.`,
      actionLabel: "Upravte ponuku alebo text inzerátu",
    };
  }

  return {
    id: reason,
    severity: "blocking",
    label: "Kontrola kvality",
    message: reason,
    actionLabel: "Skontrolujte ponuku a text inzerátu",
  };
}

function buildNextStepSummary(input: {
  status: GuardianPanelStatus;
  todoCount: number;
  blockingFlagCount: number;
}): string {
  if (input.status === "blocked") {
    const n = input.blockingFlagCount;
    return n === 1
      ? "Opravte 1 rozpor nižšie — potom skontrolujte vygenerovaný text inzerátu."
      : `Opravte ${n} rozpory nižšie — potom skontrolujte vygenerovaný text inzerátu.`;
  }
  if (input.status === "needs_data") {
    const n = input.todoCount;
    return n === 1
      ? "Doplňte 1 chýbajúci údaj v ponuke — inzerát bude silnejší a dôveryhodnejší."
      : `Doplňte ${n} chýbajúce údaje v ponuke — inzerát bude silnejší a dôveryhodnejší.`;
  }
  return "Údaje sú konzistentné. Prečítajte si vygenerovaný text inzerátu nižšie — ak sedí, môžete ho odovzdať na portál.";
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
      status: "needs_data",
      statusLabel: STATUS_LABELS.needs_data,
      nextStepSummary: "Po načítaní ponuky tu uvidíte, čo treba doplniť pred odoslaním.",
      completenessPercent: null,
      fieldsChecked: 0,
      fieldsTotal: 0,
      passItems: [],
      todoItems: [],
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

  const todoItems: GuardianPanelTodoItem[] =
    completeness?.fields
      .filter((f) => !f.present)
      .map((f) => ({
        id: f.key,
        label: f.label,
        detail: f.detail,
        actionLabel: FIELD_ACTIONS[f.key],
      })) ?? [];

  const publishBlocked = flags.some((f) => f.severity === "blocking");
  const blockingFlagCount = flags.filter((f) => f.severity === "blocking").length;
  const status: GuardianPanelStatus = publishBlocked
    ? "blocked"
    : todoItems.length > 0
      ? "needs_data"
      : "ready";

  return {
    hasOutput: Boolean(completeness || listing),
    status,
    statusLabel: STATUS_LABELS[status],
    nextStepSummary: buildNextStepSummary({
      status,
      todoCount: todoItems.length,
      blockingFlagCount,
    }),
    completenessPercent: completeness?.scorePercent ?? null,
    fieldsChecked: completeness?.filledCount ?? 0,
    fieldsTotal: completeness?.totalCount ?? 0,
    passItems,
    todoItems,
    flags,
    publishBlocked,
  };
}

export function isGuardianPublishEnabled(view: GuardianPanelView): boolean {
  return view.hasOutput && !view.publishBlocked;
}
