// Client UI: Realvia ingest logs + queue (used from /integrations/realvia).

'use client';

import { useEffect, useState, useCallback } from 'react';

interface WebhookLog {
  id: string;
  request_id: string;
  received_at: string;
  source_ip: string;
  payload_type: string;
  processed: boolean;
  processing_error: string | null;
  agency_id: string | null;
}

interface QueueJob {
  id: string;
  webhook_log_id: string;
  status: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
}

interface Stats {
  totalLogs: number;
  processedLogs: number;
  pendingJobs: number;
  failedJobs: number;
  completedJobs: number;
}

export default function RealviaIntegrationAdminClient() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTrigger, setProcessingTrigger] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaMessage, setSchemaMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/admin/realvia/dashboard', { credentials: 'include' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`,
        );
      }

      const nextLogs = (body.logs ?? []) as WebhookLog[];
      const nextJobs = (body.jobs ?? []) as QueueJob[];
      const baseStats = (body.stats ?? null) as Stats | null;

      setLogs(nextLogs);
      setJobs(nextJobs);
      setStats(baseStats ?? computeStatsFallback(nextLogs, nextJobs));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runSchemaCheck = async () => {
    setSchemaLoading(true);
    setSchemaMessage(null);
    try {
      const res = await fetch('/api/admin/realvia/schema-status', {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSchemaMessage(
          typeof data?.error === 'string'
            ? data.error
            : `Schema status failed (${res.status})`,
        );
        return;
      }

      const ok = Boolean(data?.summary?.overall_ok);
      const failed: string[] = Array.isArray(data?.summary?.checks_failed)
        ? data.summary.checks_failed
        : [];

      setSchemaMessage(
        ok
          ? 'Schéma: OK — baseline Realvia DDL je na instancii prítomné.'
          : `Schéma: CHYBY — ${failed.length ? failed.join(', ') : 'neznáme'}`,
      );
    } catch (err) {
      setSchemaMessage(err instanceof Error ? err.message : 'Schema request failed');
    } finally {
      setSchemaLoading(false);
    }
  };

  const triggerProcessing = async () => {
    setProcessingTrigger(true);
    try {
      const res = await fetch('/api/admin/realvia/run-worker', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Processing failed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger processing');
    } finally {
      setProcessingTrigger(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/95 p-6 text-gray-900 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Realvia ingest</h2>
          <p className="text-sm text-gray-500 mt-1">
            Server-side dashboard (nie anon JWT). Verejná URL:{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">/integrations/realvia</code>
          </p>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            scripts/verify-realvia-infrastructure.sql — manuál v SQL editore Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            onClick={runSchemaCheck}
            disabled={schemaLoading}
            className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded hover:bg-amber-100 disabled:opacity-50"
          >
            {schemaLoading ? 'Kontrola…' : 'Skontroluj schému (prod)'}
          </button>
          <button
            type="button"
            onClick={triggerProcessing}
            disabled={processingTrigger}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {processingTrigger ? 'Processing...' : '▶ Process Queue'}
          </button>
        </div>
      </div>

      {schemaMessage && (
        <div
          className={`mb-4 p-3 border rounded text-sm ${
            schemaMessage.startsWith('Schéma: OK')
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {schemaMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Webhooks" value={stats.totalLogs} />
          <StatCard label="Processed" value={stats.processedLogs} color="green" />
          <StatCard label="Pending Jobs" value={stats.pendingJobs} color="yellow" />
          <StatCard label="Failed Jobs" value={stats.failedJobs} color="red" />
          <StatCard label="Completed Jobs" value={stats.completedJobs} color="green" />
        </div>
      )}

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Processing Queue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Retries</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Processed</th>
                <th className="text-left p-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="p-2 font-mono">{job.retry_count}/{job.max_retries}</td>
                  <td className="p-2 text-gray-500">{formatDate(job.created_at)}</td>
                  <td className="p-2 text-gray-500">{job.processed_at ? formatDate(job.processed_at) : '—'}</td>
                  <td className="p-2 text-red-600 text-xs max-w-xs truncate">{job.error_message ?? '—'}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No queue jobs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Webhook Logs (latest 50)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Agency</th>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Processed</th>
                <th className="text-left p-2">Error</th>
                <th className="text-left p-2">Request ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-gray-500">{formatDate(log.received_at)}</td>
                  <td className="p-2 font-mono text-xs text-gray-500">
                    {log.agency_id ? `${log.agency_id.slice(0, 8)}…` : '—'}
                  </td>
                  <td className="p-2 font-mono text-xs">{log.source_ip}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      log.payload_type === 'advert' ? 'bg-blue-100 text-blue-700' :
                      log.payload_type === 'delete' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {log.payload_type}
                    </span>
                  </td>
                  <td className="p-2">{log.processed ? '✅' : '⏳'}</td>
                  <td className="p-2 text-red-600 text-xs max-w-xs truncate">{log.processing_error ?? '—'}</td>
                  <td className="p-2 font-mono text-xs text-gray-400">{log.request_id.slice(0, 8)}...</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-400">No webhook logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function computeStatsFallback(logs: WebhookLog[], jobs: QueueJob[]): Stats {
  return {
    totalLogs: logs.length,
    processedLogs: logs.filter((l) => l.processed).length,
    pendingJobs: jobs.filter((j) => j.status === 'pending').length,
    failedJobs: jobs.filter((j) => j.status === 'failed').length,
    completedJobs: jobs.filter((j) => j.status === 'completed').length,
  };
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-600' :
                     color === 'red' ? 'text-red-600' :
                     color === 'yellow' ? 'text-yellow-600' :
                     'text-gray-900';
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${classes[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sk-SK', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}
