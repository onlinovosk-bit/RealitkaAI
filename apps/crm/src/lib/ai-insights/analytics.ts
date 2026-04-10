// AI Insights analytics & reporting (demo version)
import { promises as fs } from 'fs';
import path from 'path';

const ANALYTICS_PATH = path.resolve(process.cwd(), 'data', 'ai-insights-analytics.json');

export type AIAnalyticsEvent = {
  userId: string;
  actionIdx: number;
  actionTitle: string;
  event: 'viewed' | 'executed' | 'feedback';
  value?: string;
  timestamp: string;
};

export async function logAnalyticsEvent(event: AIAnalyticsEvent) {
  let all: AIAnalyticsEvent[] = [];
  try {
    const data = await fs.readFile(ANALYTICS_PATH, 'utf-8');
    all = JSON.parse(data);
  } catch {}
  all.push(event);
  await fs.mkdir(path.dirname(ANALYTICS_PATH), { recursive: true });
  await fs.writeFile(ANALYTICS_PATH, JSON.stringify(all, null, 2), 'utf-8');
}

export async function getAnalyticsEvents(): Promise<AIAnalyticsEvent[]> {
  try {
    const data = await fs.readFile(ANALYTICS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
