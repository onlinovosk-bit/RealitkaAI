export const NEXUS_CHAT_SETTINGS_STORAGE_KEY = "revolis-nexus-chat-settings";

export type NexusReplyStyle = "professional" | "friendly" | "concise" | "sales";
export type NexusReplyLength = "short" | "medium" | "detailed";

export type NexusChatSettings = {
  replyStyle: NexusReplyStyle;
  replyLength: NexusReplyLength;
  includeSubject: boolean;
  includeCta: boolean;
};

export const DEFAULT_NEXUS_CHAT_SETTINGS: NexusChatSettings = {
  replyStyle: "professional",
  replyLength: "medium",
  includeSubject: true,
  includeCta: true,
};

export function buildNexusChatInstruction(settings: NexusChatSettings): string {
  const styleMap: Record<NexusReplyStyle, string> = {
    professional: "Použi profesionálny a dôveryhodný tón.",
    friendly: "Použi priateľský a ľudský tón.",
    concise: "Buď veľmi stručná a vecná.",
    sales: "Použi predajný štýl orientovaný na ďalší krok.",
  };

  const lengthMap: Record<NexusReplyLength, string> = {
    short: "Odpovedz v 1-2 vetách.",
    medium: "Odpovedz stručne v 2-4 vetách.",
    detailed: "Odpovedz detailnejšie, ale prakticky.",
  };

  const parts: string[] = [styleMap[settings.replyStyle], lengthMap[settings.replyLength]];

  if (settings.includeSubject) {
    parts.push("Ak navrhuješ email, pridaj aj riadok 'Predmet: ...'.");
  } else {
    parts.push("Nepoužívaj riadok 'Predmet: ...'.");
  }

  if (settings.includeCta) {
    parts.push("Na konci pridaj konkrétny odporúčaný ďalší krok pre makléra.");
  } else {
    parts.push("Bez dodatočného CTA na konci.");
  }

  return parts.join(" ");
}
