export type ValuationPropertyType = "byt" | "dom";

export type ValuationCondition =
  | "povodny"
  | "ciastocna"
  | "kompletna"
  | "novostavba";

export type ValuationHeating =
  | "plyn"
  | "elektrina"
  | "distancne"
  | "tuhle"
  | "ine";

export type ValuationPropertyInput = {
  propertyType: ValuationPropertyType;
  location: string;
  postalCode?: string;
  sqm: number;
  rooms?: number;
  condition?: ValuationCondition;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasParking?: boolean;
  landSqm?: number;
  heating?: ValuationHeating;
  /** Stored on lead only — never fed into estimate engine or LLM commentary. */
  ownerPriceExpectation?: number;
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
  phone: string;
  sellTimeline?: string;
  sellWithin12Months: boolean;
  privacyAck: boolean;
  marketingOptIn?: boolean;
};

export type ValuationLeadPayload = ValuationPropertyInput &
  ValuationContactInput & {
    agencySlug: string;
    estimate?: ValuationEstimateResult;
    abVariant?: "A" | "B";
    sessionId?: string;
  };
