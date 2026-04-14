/**
 * Revolis.AI – Playbook component system
 * Zdroj pravdy pre typy, props a Figma spec.
 */

export type PlaybookItemType = "CALL" | "MESSAGE" | "RISK" | "OPPORTUNITY";

export interface PlaybookItemProps {
  id: string;
  type: PlaybookItemType;
  title: string;
  subtitle: string;
  buyerName?: string;
  buyerScore?: number;
  propertyTitle?: string;
  badges?: string[];
  reason: string;
  ctaLabel: string;
  onClick?: () => void;
}

export interface PlaybookFilterToggleProps {
  value: "TODAY" | "WEEK";
  onChange: (value: "TODAY" | "WEEK") => void;
}

export interface PlaybookSectionHeaderProps {
  label: string;
  description?: string;
}

export const figmaComponentSpec = {
  PlaybookItemCard: {
    variants: {
      type: ["CALL", "MESSAGE", "RISK", "OPPORTUNITY"],
      emphasis: ["default", "primary"],
      size: ["sm", "md"],
    },
    props: [
      "title",
      "subtitle",
      "buyerName",
      "buyerScore",
      "propertyTitle",
      "badges",
      "reason",
      "ctaLabel",
    ],
  },
  PlaybookFilterToggle: {
    variants: {
      mode: ["pill", "segmented"],
    },
    props: ["value", "onChange"],
  },
  PlaybookSectionHeader: {
    variants: {
      tone: ["default", "warning", "success"],
    },
    props: ["label", "description"],
  },
} as const;
