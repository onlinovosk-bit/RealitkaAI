"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ManageSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPortalWithRetry = async (retries = 2) => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const res = await fetch('/api/billing/portal', { method: 'POST' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok && [408, 425, 429, 500, 502, 503, 504].includes(res.status) && attempt < retries) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
          continue;
        }
        return data as { ok?: boolean; code?: string; error?: string; result?: { url?: string } };
      } catch {
        if (attempt >= retries) throw new Error('Portal request failed');
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
      }
    }
    throw new Error('Portal request failed');
  };

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestPortalWithRetry();

      if (!data.ok) {
        if (data.code === "NO_CUSTOMER") {
          router.push('/billing');
          return;
        }
        setError(data.error ?? 'Nepodarilo sa otvoriť stránku predplatného.');
        return;
      }

      const url = data.result?.url;
      if (url) {
        window.location.href = url;
      } else {
        router.push('/billing');
      }
    } catch {
      setError('Nastala chyba pri pripájaní na server. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {loading ? 'Otváram…' : 'Spravovať predplatné'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error} <span className="block text-xs text-red-500">Použitý je automatický retry pre dočasné chyby siete.</span>
        </p>
      )}
    </div>
  );
}
