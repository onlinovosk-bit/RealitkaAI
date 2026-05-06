// ─── Lead & Deal domain types ────────────────────────────────────────────────

export type LeadIntent = "BUY_NOW" | "JUST_LOOKING" | "INVESTOR" | "UNKNOWN";
export type LeadPersona = "INVESTOR" | "FAMILY" | "DOWNSIZER" | "OTHER";
export type LeadPriority = "HIGH" | "MEDIUM" | "LOW";
export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "VIEWING_SCHEDULED"
  | "NEGOTIATING"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "DEAD";

export type Channel = "EMAIL" | "SMS" | "WHATSAPP" | "CALL";

export type InteractionType =
  | "EMAIL_SENT"
  | "EMAIL_RECEIVED"
  | "SMS_SENT"
  | "SMS_RECEIVED"
  | "CALL_INITIATED"
  | "CALL_COMPLETED"
  | "VIEWING_SCHEDULED"
  | "NOTE_ADDED";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source: string;
  stage: LeadStage;
  intent: LeadIntent;
  persona: LeadPersona;
  priority: LeadPriority;
  assigned_agent_id?: string;
  listing_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface Interaction {
  id: string;
  lead_id: string;
  agent_id?: string;
  type: InteractionType;
  channel: Channel;
  content: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export interface Deal {
  id: string;
  lead_id: string;
  listing_id: string;
  agent_id: string;
  stage: string;
  asking_price: number;
  offer_price?: number;
  commission_rate: number;
  win_probability: number;
  created_at: string;
  updated_at: string;
}

// ─── Calendar domain types ────────────────────────────────────────────────────

export interface TimeSlot {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  attendees: string[];
  lead_id?: string;
  listing_id?: string;
  agent_id: string;
  metadata: Record<string, unknown>;
}

// ─── Telephony domain types ───────────────────────────────────────────────────

export type CallStatus =
  | "INITIATED"
  | "RINGING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "NO_ANSWER";

export interface Call {
  id: string;
  lead_id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  status: CallStatus;
  duration_seconds?: number;
  initiated_at: string;
  completed_at?: string;
  recording_url?: string;
  metadata: Record<string, unknown>;
}

export interface TranscriptSegment {
  speaker: "AGENT" | "LEAD";
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export interface CallTranscript {
  call_id: string;
  segments: TranscriptSegment[];
  full_text: string;
  created_at: string;
}

// ─── MCP tool envelope ────────────────────────────────────────────────────────

export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: ToolError;
  request_id: string;
  latency_ms?: number;
}
