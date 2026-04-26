// ================================================================
// Revolis.AI — BRI Live Score Types
// "Skóre ktoré dýcha"
// ================================================================

export type BRITrajectory = 'rising' | 'stable' | 'falling' | 'dormant'

export interface BRIScoreV2 {
  profile_id:       string
  lead_id:          string
  bri_score:        number       // 0–100 — the main number
  recency_score:    number
  engagement_score: number
  source_score:     number
  match_score:      number
  time_decay:       number       // 0.05–1.0 multiplier
  velocity:         number       // delta from 24h ago
  trajectory:       BRITrajectory
  peak_score:       number       // all-time high for this lead
  score_24h_ago:    number
  score_7d_ago:     number
  last_trigger:     string
  score_factors:    BRIFactors
  computed_at:      string
}

export interface BRIFactors {
  recency:    number
  engagement: number
  source:     number
  match:      number
  decay:      number
  velocity:   number
  events_24h: number
  replies:    number
  calls:      number
}

export interface BRIComputeResult {
  lead_id:    string
  old_score:  number
  new_score:  number
  delta:      number
  trajectory: BRITrajectory
  velocity:   number
  peak_score: number
  is_hot:     boolean
  trigger:    string
  factors:    Omit<BRIFactors, 'velocity' | 'events_24h' | 'replies' | 'calls'>
}

export interface BRIHistoryPoint {
  id:             string
  lead_id:        string
  score:          number
  delta:          number
  trigger_event:  string
  factors:        BRIFactors
  created_at:     string
}

export interface BRIConfig {
  profile_id:       string
  w_recency:        number
  w_engagement:     number
  w_source_quality: number
  w_property_match: number
  w_base:           number
  hot_threshold:    number
  notify_on_hot:    boolean
  notify_on_drop:   boolean
  drop_threshold:   number
}

// UI state shape for the live score component
export interface BRILiveState {
  score:         number
  previousScore: number
  delta:         number
  trajectory:    BRITrajectory
  velocity:      number
  isHot:         boolean
  isPulsing:     boolean
  isLoading:     boolean
  factors:       BRIFactors | null
  history:       BRIHistoryPoint[]
  lastUpdated:   Date | null
}

// Color semantics for score ranges
export type BRIColorTier = 'hot' | 'warm' | 'cool' | 'cold' | 'dormant'

export function getBRIColorTier(score: number): BRIColorTier {
  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  if (score >= 40) return 'cool'
  if (score >= 20) return 'cold'
  return 'dormant'
}

// Design tokens per tier (CSS vars + hex for SVG)
export const BRI_TIER_COLORS: Record<BRIColorTier, {
  stroke: string; fill: string; text: string; label: string
}> = {
  hot:     { stroke: '#1D9E75', fill: '#E1F5EE', text: '#085041', label: 'Horúci'    },
  warm:    { stroke: '#EF9F27', fill: '#FAEEDA', text: '#633806', label: 'Teplý'     },
  cool:    { stroke: '#378ADD', fill: '#E6F1FB', text: '#0C447C', label: 'Aktívny'   },
  cold:    { stroke: '#888780', fill: '#F1EFE8', text: '#444441', label: 'Chladný'   },
  dormant: { stroke: '#B4B2A9', fill: '#F1EFE8', text: '#5F5E5A', label: 'Dormantný' },
}
