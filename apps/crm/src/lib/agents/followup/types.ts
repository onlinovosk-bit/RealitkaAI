export type FollowupDecision = "follow_up_email" | "follow_up_sms" | "wait" | "broker_review";

export type FollowupLeadInput = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  last_contact?: string | null;
  updated_at?: string | null;
  source?: string | null;
};

export type DraftAction = {
  leadId: string;
  leadName: string;
  decision: FollowupDecision;
  channel: "email" | "sms" | "none";
  subject?: string;
  body: string;
  reason: string;
};

export type Prediction = {
  agency_id: string;
  lead_id: string;
  decision: string;
  p_outcome: number;
  expected_value_eur: number;
  confidence: number;
  expected_outcome: string;
  status: "open";
};

export type FollowupEngineResult = {
  draft: DraftAction | null;
  prediction: Prediction | null;
};
