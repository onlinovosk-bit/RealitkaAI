import type { CSSProperties } from "react";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_INPUT } from "./slate-horizon-theme";

/** Shared Slate Horizon tokens for /demo marketing surfaces */
export const DEMO = {
  pageBg: SLATE_HORIZON.bg,
  ink: SLATE_HORIZON.ink,
  muted: SLATE_HORIZON.muted,
  deep: SLATE_HORIZON.deep,
  line: SLATE_HORIZON.line,
  soft: SLATE_HORIZON.soft,
  brand: SLATE_HORIZON.brand,
  brandDeep: SLATE_HORIZON.brandDeep,
  brandTint: "#EFF6FF",
  green: SLATE_HORIZON.green,
  greenDark: SLATE_HORIZON.greenDark,
  amber: SLATE_HORIZON.amber,
  red: SLATE_HORIZON.red,
  danger: SLATE_HORIZON.danger,
  focusRing: SLATE_HORIZON.focusRing,
  ctaGradient: SLATE_HORIZON.ctaGradient,
  topbarGradient: SLATE_HORIZON.topbarGradient,
  heroGradient: SLATE_HORIZON.heroGradient,
  cardShadow: SLATE_HORIZON.cardShadow,
  card: WORKDESK_CARD,
} as const;

export const DEMO_INNER_PANEL: CSSProperties = {
  background: SLATE_HORIZON.bg,
  border: `1px solid ${SLATE_HORIZON.line}`,
};

export const DEMO_INPUT_STYLE: CSSProperties = {
  background: WORKDESK_INPUT.background,
  border: `1px solid ${WORKDESK_INPUT.borderColor}`,
  color: WORKDESK_INPUT.color,
  outline: "none",
};

export const DEMO_INPUT_BRAND: CSSProperties = {
  ...DEMO_INPUT_STYLE,
  border: `1px solid ${SLATE_HORIZON.softBorder}`,
};

export const DEMO_PROGRESS_TRACK: CSSProperties = {
  background: SLATE_HORIZON.line,
};

export const DEMO_LIST_ITEM: CSSProperties = {
  background: DEMO.brandTint,
  border: `1px solid ${SLATE_HORIZON.line}`,
};

export const DEMO_LIST_ITEM_URGENT: CSSProperties = {
  background: "#FEF2F2",
  border: "1px solid #FECACA",
};

export const DEMO_ERROR: CSSProperties = {
  background: "#FEF2F2",
  color: SLATE_HORIZON.danger,
};

export const DEMO_SUCCESS: CSSProperties = {
  color: SLATE_HORIZON.greenDark,
};
