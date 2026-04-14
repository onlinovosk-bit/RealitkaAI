"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ManageSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();

      if (!data.ok) {
        if (data.code === "NO_CUSTOMER") {
          router.push('/billing');
          return;
        }
        setError(data.error ?? 'Nepodarilo sa otvoriť stránku predplatného.');
        return;
      }

      const { url } = data.result;
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
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
