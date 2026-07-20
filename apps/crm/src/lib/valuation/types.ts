export type ValuationPropertyType = "byt" | "dom";

export type ValuationCondition =
  | "povodny"
  | "ciastocna"
  | "kompletna"
  | "novostavba";

export type ValuationPropertyInput = {
  propertyType: ValuationPropertyType;
  location: string;
  sqm: number;
  rooms?: number;
  condition?: ValuationCondition;
  floor?: number;
  hasElevator?: boolean;
  hasBalcony?: boolean;
};

export type ValuationEstimateResult = {
  noEstimate: boolean;
  low?: number;
  high?: number;
  currency: "EUR";
  pricePerSqm?: number;
  regionCode?: string;
  regionLabel?: string;
  sourceQuarter?: string;
  sourceNote?: string;
  commentary: string;
  disclaimer: string;
};

export type ValuationContactInput = {
  name: string;
  email: string;
  phone?: string;
  sellWithin12Months: boolean;
  privacyAck: boolean;
  marketingOptIn?: boolean;
};

export type ValuationLeadPayload = ValuationPropertyInput &
  ValuationContactInput & {
    agencySlug: string;
    estimate?: ValuationEstimateResult;
  };
