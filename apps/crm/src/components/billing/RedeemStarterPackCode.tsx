'use client';

import React, { useState } from 'react';
import { SLATE_HORIZON } from '@/lib/slate-horizon-theme';

export function RedeemStarterPackCode({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/billing/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(data.data?.message ?? 'Kód uplatnený.');
        if (!data.data?.alreadyRedeemed) setCode('');
      } else {
        setError(data.error ?? 'Uplatnenie zlyhalo.');
      }
    } catch {
      setError('Nepodarilo sa uplatniť kód.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRedeem} className={compact ? '' : 'mt-2'}>
      <label className="block text-sm font-medium mb-2" style={{ color: SLATE_HORIZON.ink }}>
        Mám kód z balíka
      </label>
      <div className={`flex gap-2 ${compact ? 'flex-col sm:flex-row' : ''}`}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="REV-47-XXXXXX"
          className="flex-1 rounded-md border px-3 py-2 text-sm font-mono uppercase"
          style={{ borderColor: SLATE_HORIZON.line }}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-md px-4 py-2 text-sm font-semibold text-white shrink-0"
          style={{
            background: SLATE_HORIZON.brand,
            opacity: loading || !code.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '…' : 'Uplatniť'}
        </button>
      </div>
      {message && (
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.greenDark }}>
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.danger }}>
          {error}
        </p>
      )}
    </form>
  );
}
