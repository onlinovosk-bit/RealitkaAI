import { useEffect, useState } from "react";
import { useState as useLocalState } from "react";
import type { DashboardInsightsResponse } from "../../../types/dashboard";

// Backend API helpers
async function fetchHistory(userId: string) {
  const res = await fetch(`/api/ai-insights/history?userId=${userId}`);
  if (res.ok) return res.json();
  return {};
}
async function saveHistory(userId: string, history: any) {
  await fetch(`/api/ai-insights/history?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history),
  });
}
async function logAnalytics(event: any) {
  await fetch('/api/ai-insights/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
}

export default function AIInsightsBox({ userName }: { userName?: string }) {
  const [insight, setInsight] = useState<DashboardInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useLocalState<string | null>(null);
  const [feedback, setFeedback] = useLocalState<Record<number, 'up' | 'down'>>({});
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sort, setSort] = useState<'impact' | 'type'>('impact');
  const [history, setHistoryState] = useState<any>({});
  const [note, setNote] = useState<Record<number, string>>({});
  const [showReminder, setShowReminder] = useState(false);
  const [abTest, setAbTest] = useState<'A' | 'B'>(Math.random() > 0.5 ? 'A' : 'B');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const fetchInsights = async () => {
      const summary = await fetch("/api/dashboard/summary").then((res) => res.json());
      const insight = await fetch("/api/dashboard/insights", {
        method: "POST",
        body: JSON.stringify({ period: "today", summary, userName }),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
      setInsight(insight);
      setLoading(false);
      // Získaj userId z insightu alebo FE (demo: použijeme meno)
      setUserId(userName || 'demo');
      // Načítaj históriu z backendu
      const h = await fetchHistory(userName || 'demo');
      setHistoryState(h || {});
      // Log view event
      await logAnalytics({
        userId: userName || 'demo',
        actionIdx: -1,
        actionTitle: 'dashboard-insights',
        event: 'viewed',
        timestamp: new Date().toISOString(),
      });
    };
    fetchInsights();
    // Pripomienka na nevykonané akcie
    const timer = setTimeout(() => {
      if (Object.values(history).some((h: any) => h.status !== 'done')) setShowReminder(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [userName, history]);

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white shadow-xl">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">🤖 AI Insights</h2>
        <p className="text-sm opacity-70">Analyzujeme tvoje dáta...</p>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  const handleAction = async (idx: number) => {
    setExecuting(`action-${idx}`);
    await new Promise((res) => setTimeout(res, 1200));
    setExecuting(null);
    // Uložiť do backend histórie
    const newHistory = { ...history, [idx]: { status: 'done', feedback: feedback[idx] || null, note: note[idx] || '' } };
    setHistoryState(newHistory);
    await saveHistory(userId, newHistory);
    await logAnalytics({
      userId,
      actionIdx: idx,
      actionTitle: insight?.actions[idx].title,
      event: 'executed',
      timestamp: new Date().toISOString(),
    });
    alert(`Akcia "${insight?.actions[idx].title}" bola vykonaná!`);
  };

  const handleFeedback = async (idx: number, type: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [idx]: type }));
    const newHistory = { ...history, [idx]: { ...(history[idx] || {}), feedback: type } };
    setHistoryState(newHistory);
    await saveHistory(userId, newHistory);
    await logAnalytics({
      userId,
      actionIdx: idx,
      actionTitle: insight?.actions[idx].title,
      event: 'feedback',
      value: type,
      timestamp: new Date().toISOString(),
    });
  };

  // Filtrovanie a zoradenie
  let actions = insight.actions.map((a, idx) => ({ ...a, idx }));
  if (filter !== 'all') {
    actions = actions.filter(a => a.impact === filter);
  }
  if (sort === 'impact') {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    actions = actions.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  } else if (sort === 'type') {
    actions = actions.sort((a, b) => a.recommendedChannel.localeCompare(b.recommendedChannel));
  }

  // Badge na nevykonané akcie
  const undoneCount = actions.filter(a => !history[a.idx] || history[a.idx].status !== 'done').length;

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">{insight.headline}</h2>
        {undoneCount > 0 && <span className="ml-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">{undoneCount} nesplnené</span>}
      </div>
      <p className="mb-4 text-base opacity-90">{insight.summary}</p>

      <div className="flex gap-4 mb-3 flex-wrap">
        <div>
          <label className="text-xs mr-2">Filtrovať podľa impaktu:</label>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-gray-800 text-white text-xs rounded px-2 py-1">
            <option value="all">Všetko</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="text-xs mr-2">Zoradiť podľa:</label>
          <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-gray-800 text-white text-xs rounded px-2 py-1">
            <option value="impact">Impakt</option>
            <option value="type">Typ akcie</option>
          </select>
        </div>
      </div>

      <ol className="space-y-3 list-decimal list-inside">
        {actions.map((action) => (
          <li key={action.idx} className={`p-3 rounded-xl border bg-white/10 border-white/20 flex flex-col gap-2 ${history[action.idx]?.status === 'done' ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{action.title}</div>
                <div className="text-sm mb-1 opacity-90">{action.description}</div>
                <span className="text-xs text-blue-200">{action.recommendedChannel.toUpperCase()}</span>
                {/* Integrácia: demo dialóg podľa typu akcie */}
                {action.recommendedChannel === 'call' && abTest === 'A' && (
                  <button className="mt-2 text-xs underline text-blue-300" onClick={() => alert('Otvoriť dialóg s kontaktom (demo)')}>Zavolať kontaktu</button>
                )}
                {action.recommendedChannel === 'email' && abTest === 'B' && (
                  <button className="mt-2 text-xs underline text-blue-300" onClick={() => alert('Predvyplniť email šablónu (demo)')}>Odoslať email</button>
                )}
              </div>
              <button
                className={`ml-4 px-3 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed`}
                disabled={!!executing || history[action.idx]?.status === 'done'}
                onClick={() => handleAction(action.idx)}
              >
                {executing === `action-${action.idx}` ? 'Vykonávam...' : history[action.idx]?.status === 'done' ? 'Hotovo' : 'Vykonať'}
              </button>
            </div>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-xs text-gray-400">Užitočné?</span>
              <button
                className={`text-lg ${feedback[action.idx] === 'up' ? 'text-green-400' : 'text-gray-400'}`}
                onClick={() => handleFeedback(action.idx, 'up')}
                disabled={!!feedback[action.idx]}
                aria-label="Užitočné"
              >👍</button>
              <button
                className={`text-lg ${feedback[action.idx] === 'down' ? 'text-red-400' : 'text-gray-400'}`}
                onClick={() => handleFeedback(action.idx, 'down')}
                disabled={!!feedback[action.idx]}
                aria-label="Neužitočné"
              >👎</button>
              {/* Poznámka */}
              <input
                className="ml-2 px-2 py-1 text-xs rounded bg-gray-800 text-white border border-gray-700"
                placeholder="Poznámka..."
                value={note[action.idx] || history[action.idx]?.note || ''}
                onChange={e => setNote(n => ({ ...n, [action.idx]: e.target.value }))}
                onBlur={e => {
                  const newHistory = { ...history, [action.idx]: { ...(history[action.idx] || {}), note: e.target.value } };
                  setHistoryState(newHistory);
                }}
                disabled={history[action.idx]?.status === 'done'}
                style={{ minWidth: 80 }}
              />
            </div>
            {/* História feedbacku */}
            {history[action.idx] && (
              <div className="text-xs text-gray-400 mt-1">
                <span>Stav: {history[action.idx].status === 'done' ? 'Hotovo' : 'Čaká'}</span>
                {history[action.idx].feedback && (
                  <span className="ml-2">Feedback: {history[action.idx].feedback === 'up' ? '👍' : '👎'}</span>
                )}
                {history[action.idx].note && (
                  <span className="ml-2">Poznámka: {history[action.idx].note}</span>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {insight.notesForOwner && (
        <div className="mt-4 p-2 text-xs text-gray-300 border-t border-white/10">{insight.notesForOwner}</div>
      )}
      {/* Automatická pripomienka */}
      {showReminder && undoneCount > 0 && (
        <div className="mt-4 p-2 text-xs bg-yellow-100 text-yellow-900 rounded border border-yellow-300">
          Máš {undoneCount} nesplnených AI odporúčaní! Skús ich dokončiť pre maximálny efekt.
        </div>
      )}
      {/* A/B test info */}
      <div className="mt-2 text-xs text-gray-500">A/B test CTA: {abTest === 'A' ? 'Zavolať kontaktu' : 'Odoslať email'}</div>
    </div>
  );
}
