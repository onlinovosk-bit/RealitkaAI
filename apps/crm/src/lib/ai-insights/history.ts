// AI Insights persistent history (backend-ready, demo version)
import { promises as fs } from 'fs';
import path from 'path';

const HISTORY_PATH = path.resolve(process.cwd(), 'data', 'ai-insights-history.json');

export type AIActionHistory = {
  userId: string;
  date: string;
  actions: Array<{
    idx: number;
    status: 'done' | 'pending';
    feedback?: 'up' | 'down';
    note?: string;
    actionTitle: string;
    insightHeadline: string;
  }>;
};

export async function getUserHistory(userId: string): Promise<AIActionHistory | null> {
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf-8');
    const all = JSON.parse(data);
    return all[userId] || null;
  } catch {
    return null;
  }
}

export async function saveUserHistory(userId: string, history: AIActionHistory) {
  let all = {};
  try {
    const data = await fs.readFile(HISTORY_PATH, 'utf-8');
    all = JSON.parse(data);
  } catch {}
  all[userId] = history;
  await fs.mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  await fs.writeFile(HISTORY_PATH, JSON.stringify(all, null, 2), 'utf-8');
}
