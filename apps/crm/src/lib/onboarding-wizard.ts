import type { MorningBriefData } from "@/types/morning-brief";

export const WIZARD_STEPS = [
  { step: 1, slug: "office", label: "Profil kancelárie" },
  { step: 2, slug: "import", label: "Import dát" },
  { step: 3, slug: "brief", label: "Ranný report & tím" },
] as const;

export type WizardStepNumber = (typeof WIZARD_STEPS)[number]["step"];

export type WizardOfficeProfile = {
  agencyName: string;
  city: string;
  phone: string;
};

export type WizardState = {
  wizardCompleted: boolean;
  wizardSkipped: boolean;
  wizardStep: WizardStepNumber;
};

export const DEFAULT_WIZARD_STATE: WizardState = {
  wizardCompleted: false,
  wizardSkipped: false,
  wizardStep: 1,
};

export function normalizeWizardState(raw: Partial<WizardState> | null | undefined): WizardState {
  const step = Number(raw?.wizardStep);
  const wizardStep: WizardStepNumber =
    step >= 1 && step <= 3 ? (step as WizardStepNumber) : 1;

  return {
    wizardCompleted: Boolean(raw?.wizardCompleted),
    wizardSkipped: Boolean(raw?.wizardSkipped),
    wizardStep,
  };
}

export function isWizardComplete(state: WizardState): boolean {
  return state.wizardCompleted || state.wizardSkipped;
}

export function shouldShowWizard(
  enabled: boolean,
  state: WizardState,
  role: string | null | undefined,
): boolean {
  if (!enabled) return false;
  if (isWizardComplete(state)) return false;
  return role === "owner" || role === "founder";
}

export function resolveWizardPath(state: WizardState): string {
  if (isWizardComplete(state)) return "/dashboard";
  const clamped = Math.min(Math.max(state.wizardStep, 1), 3);
  return `/get-started/${clamped}`;
}

export function resolvePostLoginPath(
  enabled: boolean,
  state: WizardState,
  role: string | null | undefined,
  requestedPath = "/dashboard",
): string {
  if (!shouldShowWizard(enabled, state, role)) return requestedPath;
  return resolveWizardPath(state);
}

export function nextWizardStep(current: WizardStepNumber): WizardStepNumber {
  return current >= 3 ? 3 : ((current + 1) as WizardStepNumber);
}

export function prevWizardStep(current: WizardStepNumber): WizardStepNumber {
  return current <= 1 ? 1 : ((current - 1) as WizardStepNumber);
}

export function completeWizardState(state: WizardState): WizardState {
  return {
    ...state,
    wizardCompleted: true,
    wizardSkipped: false,
    wizardStep: 3,
  };
}

export function skipWizardState(state: WizardState): WizardState {
  return {
    ...state,
    wizardCompleted: false,
    wizardSkipped: true,
    wizardStep: state.wizardStep,
  };
}

export function advanceWizardState(state: WizardState): WizardState {
  if (state.wizardStep >= 3) {
    return completeWizardState(state);
  }
  return {
    ...state,
    wizardStep: nextWizardStep(state.wizardStep),
  };
}

export function mergeWizardIntoChecklist(
  checklist: Record<string, boolean | number | undefined>,
  wizard: WizardState,
): Record<string, boolean | number | undefined> {
  return {
    ...checklist,
    wizardCompleted: wizard.wizardCompleted,
    wizardSkipped: wizard.wizardSkipped,
    wizardStep: wizard.wizardStep,
  };
}

export function extractWizardFromChecklist(
  checklist: Record<string, unknown> | null | undefined,
): WizardState {
  return normalizeWizardState({
    wizardCompleted: Boolean(checklist?.wizardCompleted),
    wizardSkipped: Boolean(checklist?.wizardSkipped),
    wizardStep: Number(checklist?.wizardStep) as WizardStepNumber,
  });
}

export function slugifyAgencyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export const WIZARD_PLAYBOOK_LINKS = [
  {
    title: "Univerzálny import kontaktov",
    href: "/import/universal",
    description: "CSV alebo Excel — mapovanie stĺpcov a náhľad pred importom.",
  },
  {
    title: "Playbook — denné priority",
    href: "/playbook",
    description: "Čo volať, písať a potvrdiť dnes — podľa skóre a stavu klientov.",
  },
] as const;

export function buildWizardMorningBriefPreview(ownerName: string): MorningBriefData {
  const now = new Date().toISOString();
  return {
    briefId: "wizard-preview",
    profileId: "wizard-preview",
    generatedAt: now,
    topLead: {
      id: "preview-lead-1",
      name: "Kontakt z Prešova",
      score: 87,
      trajectory: "↑ +12",
      reason: "Nový záujem o byt — odpovedal včera večer",
      lastAction: "Otvoril email s ponukou",
      phone: "+421900000000",
      email: "kontakt@example.sk",
      property: "3-izb. byt, centrum",
    },
    overnight: {
      totalChanges: 4,
      newLeads: 2,
      lvChanges: [],
      arbitrage: [],
      priceDrops: [],
      replies: [
        {
          leadId: "preview-lead-1",
          leadName: "Kontakt z Prešova",
          repliedAt: now,
          messagePreview: "Môžeme sa stretnúť vo štvrtok?",
        },
      ],
    },
    action: {
      verb: "Zavolať",
      target: "Kontakt z Prešova",
      context: "Odpovedal včera večer — volanie pred 10:00",
      deepLink: "/leads/preview-lead-1",
      urgency: "high",
    },
    stats: {
      hotLeads: 3,
      activeLeads: 12,
      newInquiries: 2,
      scoreIncreases: 1,
      weeklyRevForecast: null,
    },
    aiText:
      `Dobré ráno, ${ownerName}. Dnes máš 3 HOT leady. Priorita: Kontakt z Prešova (BRI 87) — odpovedal včera večer na ponuku 3-izb. bytu. Odporúčam volanie pred 10:00.`,
    variant: "A",
    subjectLine: "Ranný brief — 3 HOT leadov",
  };
}
