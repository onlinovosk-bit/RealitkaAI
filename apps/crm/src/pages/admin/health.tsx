import { useEffect, useState } from "react";

export default function HealthPage() {
  const [status, setStatus] = useState({
    env: {},
    api: {},
    supabase: {},
    runtime: {},
  });

  useEffect(() => {
    async function runChecks() {
      const checks = {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_KEY:
            !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
            !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        api: {
          leads: await check("/api/leads"),
          health: await check("/api/health"),
        },
        supabase: {
          reachable: await check(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
        },
        runtime: {
          mode: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      };

      setStatus(checks);
    }

    async function check(url: string) {
      try {
        const res = await fetch(url);
        return res.ok;
      } catch {
        return false;
      }
    }

    runChecks();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Activation / Health Status</h1>

      <section>
        <h2>Environment Variables</h2>
        <pre>{JSON.stringify(status.env, null, 2)}</pre>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <pre>{JSON.stringify(status.api, null, 2)}</pre>
      </section>

      <section>
        <h2>Supabase</h2>
        <pre>{JSON.stringify(status.supabase, null, 2)}</pre>
      </section>

      <section>
        <h2>Runtime</h2>
        <pre>{JSON.stringify(status.runtime, null, 2)}</pre>
      </section>
    </div>
  );
}
