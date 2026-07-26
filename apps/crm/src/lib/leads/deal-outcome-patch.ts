/** PATCH body fields for moat deal_outcomes capture (PR-B2 modal). */
export type DealOutcomePatchFields = {
  dealOutcomeReasonCode: string;
  dealOutcomeReasonText?: string | null;
};

export function withDealOutcomePatchFields<T extends Record<string, unknown>>(
  fields: T,
  dealOutcome: DealOutcomePatchFields,
): T & DealOutcomePatchFields {
  return {
    ...fields,
    dealOutcomeReasonCode: dealOutcome.dealOutcomeReasonCode,
    dealOutcomeReasonText: dealOutcome.dealOutcomeReasonText ?? null,
  };
}
