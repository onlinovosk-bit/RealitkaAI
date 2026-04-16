export const NEXUS_CHAT_SETTINGS_STORAGE_KEY = "revolis-nexus-chat-settings";

export type NexusReplyStyle = "professional" | "friendly" | "concise" | "sales";
export type NexusReplyLength = "short" | "medium" | "detailed";
export type NexusFormality = "tykanie" | "vykanie";
export type NexusOutputChannel = "email" | "sms" | "call";

export type NexusChatSettings = {
  replyStyle: NexusReplyStyle;
  replyLength: NexusReplyLength;
  includeSubject: boolean;
  includeCta: boolean;
  formality: NexusFormality;
  outputChannel: NexusOutputChannel;
  signatureName: string;
  signatureCompany: string;
  signaturePhone: string;
};

export const DEFAULT_NEXUS_CHAT_SETTINGS: NexusChatSettings = {
  replyStyle: "professional",
  replyLength: "medium",
  includeSubject: true,
  includeCta: true,
  formality: "vykanie",
  outputChannel: "email",
  signatureName: "",
  signatureCompany: "",
  signaturePhone: "",
};

export function buildNexusChatInstruction(settings: NexusChatSettings): string {
  const styleMap: Record<NexusReplyStyle, string> = {
    professional: "Použi profesionálny a dôveryhodný tón.",
    friendly: "Použi priateľský a ľudský tón.",
    concise: "Buď veľmi stručný a vecný.",
    sales: "Použi predajný štýl orientovaný na ďalší krok.",
  };

  const lengthMap: Record<NexusReplyLength, string> = {
    short: "Odpovedz v 1-2 vetách.",
    medium: "Odpovedz stručne v 2-4 vetách.",
    detailed: "Odpovedz detailnejšie, ale prakticky.",
  };

  const formalityMap: Record<NexusFormality, string> = {
    tykanie: "Používaj tykanie (ty/tvoj).",
    vykanie: "Používaj vykanie (Vy/Váš).",
  };

  const channelMap: Record<NexusOutputChannel, string> = {
    email: "Formátuj odpoveď ako email.",
    sms: "Formátuj odpoveď ako krátku SMS správu (max 160 znakov).",
    call: "Formátuj odpoveď ako osnovu telefonátu s kľúčovými bodmi.",
  };

  const parts: string[] = [
    styleMap[settings.replyStyle],
    lengthMap[settings.replyLength],
    formalityMap[settings.formality],
    channelMap[settings.outputChannel],
  ];

  if (settings.includeSubject && settings.outputChannel === "email") {
    parts.push("Pridaj aj riadok 'Predmet: ...'.");
  }

  if (settings.includeCta) {
    parts.push("Na konci pridaj konkrétny odporúčaný ďalší krok pre makléra.");
  }

  const sigParts: string[] = [];
  if (settings.signatureName) sigParts.push(settings.signatureName);
  if (settings.signatureCompany) sigParts.push(settings.signatureCompany);
  if (settings.signaturePhone) sigParts.push(settings.signaturePhone);
  if (sigParts.length > 0) {
    parts.push(`Na konci správy pridaj podpis: ${sigParts.join(", ")}.`);
  }

  return parts.join(" ");
}
