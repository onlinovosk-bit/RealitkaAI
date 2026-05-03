'use client';
import React, { useState, useEffect } from 'react';

const DEMO_PLANS: Record<string, { name: string; price: string }> = {
  'free':               { name: 'FREE',               price: '0 €'   },
  'starter':            { name: 'SMART START',        price: '49 €'  },
  'active_force':       { name: 'ACTIVE FORCE',       price: '99 €'  },
  'market_vision':      { name: 'MARKET VISION',      price: '199 €' },
  'protocol_authority': { name: 'PROTOCOL AUTHORITY', price: '449 €' },
};

export default function BillingPage() {
  const [plan, setPlan] = useState(DEMO_PLANS['protocol_authority']);

  useEffect(() => {
    const stored = localStorage.getItem('founderDemoProgram');
    if (stored && DEMO_PLANS[stored]) setPlan(DEMO_PLANS[stored]);

    function onStorage(e: StorageEvent) {
      if (e.key === 'founderDemoProgram' && e.newValue && DEMO_PLANS[e.newValue]) {
        setPlan(DEMO_PLANS[e.newValue]);
      }
    }
    function onCustom(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      if (id && DEMO_PLANS[id]) setPlan(DEMO_PLANS[id]);
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('founderDemoProgramChanged', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('founderDemoProgramChanged', onCustom);
    };
  }, []);

  return (
    <div
      className="mx-auto max-w-4xl py-8 px-6"
      style={{ background: "#050914", minHeight: "100vh" }}
    >
      <header
        className="mb-8 border-b pb-4"
        style={{ borderColor: "#0F1F3D" }}
      >
        <h1 className="text-3xl font-bold" style={{ color: "#F0F9FF" }}>Predplatné a licencie</h1>
        <p style={{ color: "#64748B" }}>Spravujte svoj balík a fakturačné údaje pre Reality Monopol.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div
          className="rounded-xl border p-6"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>Aktuálny program</h3>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE" }}
              >
                {plan.name}
              </span>
            </div>
            <span className="text-2xl font-bold" style={{ color: "#F0F9FF" }}>
              {plan.price}<span className="text-sm font-normal" style={{ color: "#64748B" }}>/mes</span>
            </span>
          </div>
          <button
            className="w-full rounded-md py-2 font-semibold transition"
            style={{
              background: "linear-gradient(135deg, #22D3EE, #0EA5E9)",
              color: "#050914",
            }}
          >
            Spravovať v Stripe
          </button>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <h3 className="mb-4 text-lg font-semibold" style={{ color: "#F0F9FF" }}>Využitie zdrojov</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm" style={{ color: "#94A3B8" }}>
                <span>AI Tokeny</span>
                <span>85%</span>
              </div>
              <div
                className="h-2 w-full rounded-full"
                style={{ background: "#0F1F3D" }}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ width: '85%', background: "linear-gradient(135deg, #22D3EE, #0EA5E9)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
