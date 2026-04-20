export type SignalType = "email_open" | "email_click" | "portal_visit" | "call" | "meeting";
export type Signal = { type: SignalType; timestamp: string; metadata?: Record<string, unknown> };
const W: Record<SignalType, number> = { email_open: 2, email_click: 5, portal_visit: 3, call: 10, meeting: 15 };
export function scoreSignals(signals: Signal[]): number {
  return signals.reduce((s, x) => s + (W[x.type] ?? 1), 0);
}
