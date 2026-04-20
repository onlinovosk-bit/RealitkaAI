import { NextResponse } from "next/server";

type ProbeResult = {
  target: string;
  status: "ok" | "degraded";
  detail: string;
  httpStatus?: number;
  latencyMs?: number;
};

async function probeUrl(url: string, acceptedStatuses: number[]) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - started;
    const ok = acceptedStatuses.includes(response.status);
    return {
      target: url,
      status: ok ? "ok" : ("degraded" as const),
      detail: ok ? "reachable" : `unexpected status ${response.status}`,
      httpStatus: response.status,
      latencyMs,
    } satisfies ProbeResult;
  } catch {
    return {
      target: url,
      status: "degraded",
      detail: "timeout or network failure",
      latencyMs: Date.now() - started,
    } satisfies ProbeResult;
  }
}

function getBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "https://app.revolis.ai").trim();
  try {
    return new URL(raw).origin;
  } catch {
    return "https://app.revolis.ai";
  }
}

export async function GET() {
  const base = getBaseUrl();
  const probes = await Promise.all([
    probeUrl(`${base}/api/auth/login`, [400, 401, 405, 200]),
    probeUrl(`${base}/api/billing/checkout`, [400, 401, 405, 200]),
    probeUrl(`${base}/api/billing/portal`, [400, 401, 405, 200]),
    probeUrl(`${base}/dashboard`, [200, 302, 303, 307, 308]),
    probeUrl(`${base}/api/healthz`, [200]),
  ]);

  const degraded = probes.filter((p) => p.status === "degraded");

  return NextResponse.json({
    ok: degraded.length === 0,
    generatedAt: new Date().toISOString(),
    degradedCount: degraded.length,
    probes,
  });
}
