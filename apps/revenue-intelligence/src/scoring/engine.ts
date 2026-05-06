export interface DemoScoringInput {
  ahaMonent?: boolean
  leadsRecognized?: number
  estimatedLostDeals?: number
  hasSystem?: boolean
  preDemoEngaged?: boolean
  teamSize?: number
  leadsPerMonth?: number
  openConfirmed?: boolean
}

export interface ScoreResult {
  score: number
  bucket: 'HIGH' | 'MEDIUM' | 'LOW'
  signals: string[]
}

const RULES: Array<{ signal: string; points: number; check: (d: DemoScoringInput) => boolean }> = [
  { signal: 'aha_moment',               points: 30, check: (d) => d.ahaMonent === true },
  { signal: 'leads_recognized_2plus',   points: 20, check: (d) => (d.leadsRecognized ?? 0) >= 2 },
  { signal: 'estimated_lost_deals_3+',  points: 20, check: (d) => (d.estimatedLostDeals ?? 0) >= 3 },
  { signal: 'no_existing_system',       points: 15, check: (d) => d.hasSystem === false },
  { signal: 'pre_demo_engaged',         points: 15, check: (d) => d.preDemoEngaged === true },
  { signal: 'team_size_5plus',          points: 10, check: (d) => (d.teamSize ?? 0) >= 5 },
  { signal: 'leads_per_month_100plus',  points: 10, check: (d) => (d.leadsPerMonth ?? 0) >= 100 },
  { signal: 'open_confirmed',           points:  5, check: (d) => d.openConfirmed === true },
]

export function scoreDemo(input: DemoScoringInput): ScoreResult {
  const signals: string[] = []
  let score = 0

  for (const rule of RULES) {
    if (rule.check(input)) {
      score += rule.points
      signals.push(rule.signal)
    }
  }

  const bucket: 'HIGH' | 'MEDIUM' | 'LOW' =
    score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW'

  return { score: Math.min(score, 100), bucket, signals }
}
