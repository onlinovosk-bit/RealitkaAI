import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

/**
 * Auth pages (login / register / password recovery) reuse the post-login
 * workdesk tokens — no new hex values. Header/buttons use the same
 * topbarGradient as WorkdeskTopbar and marketing `--brand-grad`.
 */
export const AUTH_PAGE = {
  pageBackground: `linear-gradient(180deg, ${SLATE_HORIZON.bg}, #ffffff)`,
  headerBackground: SLATE_HORIZON.topbarGradient,
  buttonBackground: SLATE_HORIZON.topbarGradient,
  panelBackground: SLATE_HORIZON.noticeGradient,
  cardBackground: WORKDESK_CARD.background,
  cardBorder: SLATE_HORIZON.softBorder,
  cardShadow: SLATE_HORIZON.cardHoverShadow,
  ink: SLATE_HORIZON.ink,
  muted: SLATE_HORIZON.muted,
  deep: SLATE_HORIZON.deep,
  brand: SLATE_HORIZON.brand,
  brandDeep: SLATE_HORIZON.brandDeep,
  brand2: SLATE_HORIZON.brand2,
  line: SLATE_HORIZON.line,
  soft: SLATE_HORIZON.soft,
  green: SLATE_HORIZON.green,
  focusRing: SLATE_HORIZON.focusRing,
} as const;

export const AUTH_INPUT_CLASS =
  `w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${SLATE_HORIZON.focusRing}`;
