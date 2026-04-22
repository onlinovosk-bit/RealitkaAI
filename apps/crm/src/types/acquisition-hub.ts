// ─── Module 1: AI Odhadca ─────────────────────────────────────────────────
export type PropertyEstimate = {
  address: string;
  estimatedPrice: number;
  pricePerSqm: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'rising' | 'stable' | 'falling';
  comparables: number;
  generatedAt: string;
};

// ─── Module 2: Neighborhood Watch ────────────────────────────────────────
export type NeighborAlert = {
  id: string;
  address: string;
  area: string;
  eventType: 'price_drop' | 'new_listing' | 'sold' | 'price_increase';
  changeAmount?: number;
  daysAgo: number;
  isUrgent: boolean;
};

// ─── Module 3: Digital Twin / Meta ───────────────────────────────────────
export type MetaLookalikeResult = {
  audienceId: string;
  audienceName: string;
  size: number;
  status: 'creating' | 'ready' | 'error' | 'demo';
  lookalikeId?: string;
  message: string;
};

// ─── Module 4: AI Ghostwriter ─────────────────────────────────────────────
export type GhostwriterLetter = {
  id: string;
  ownerAddress: string;
  eventType: string;
  letterHtml: string;
  letterText: string;
  createdAt: string;
};

// ─── Module 5: Real Estate Arbitrage ─────────────────────────────────────
export type ArbitrageCandidate = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  interestedAddress: string;
  ownedAddress?: string;
  arbitrageScore: number; // 0–100
  reasoning: string;
  recommendedAction: string;
};

// ─── Module 6: Stealth Recruiter ─────────────────────────────────────────
export type StealthProspect = {
  id: string;
  address: string;
  platform: 'bazos' | 'nehnutelnosti' | 'reality' | 'facebook' | 'other';
  daysListed: number;
  originalPrice: number;
  currentPrice: number;
  priceDropPercent: number;
  score: number; // 0–100 likelihood to accept agent
  status: 'identified' | 'outreached' | 'responded' | 'converted';
  aiOutreach?: string;
};

// ─── Shared ───────────────────────────────────────────────────────────────
export type DemoLeadCapture = {
  email: string;
  address: string;
  source: 'ai_odhadca' | 'neighborhood_watch' | 'digital_twin' | 'ghostwriter' | 'arbitrage' | 'stealth_recruiter';
  estimatedPrice?: number;
  capturedAt: string;
};

export type ModuleStatus =
  | 'idle'
  | 'loading'
  | 'calculating'
  | 'generating'
  | 'scanning'
  | 'done'
  | 'error'
  | 'email_pending'
  | 'email_sent';
