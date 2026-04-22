export type PropertyEstimate = {
  address: string;
  estimatedPrice: number;
  pricePerSqm: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'rising' | 'stable' | 'falling';
  comparables: number;
  generatedAt: string;
};

export type NeighborAlert = {
  id: string;
  address: string;
  eventType: 'price_drop' | 'new_listing' | 'sold' | 'price_increase';
  changeAmount?: number;
  daysAgo: number;
  isUrgent: boolean;
};

export type DemoLeadCapture = {
  email: string;
  address: string;
  source: 'ai_odhadca' | 'neighborhood_watch' | 'digital_twin';
  estimatedPrice?: number;
  capturedAt: string;
};

export type ModuleStatus =
  | 'idle'
  | 'calculating'
  | 'done'
  | 'error'
  | 'email_pending'
  | 'email_sent';
