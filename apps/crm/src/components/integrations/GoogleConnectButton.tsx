"use client";
import { useState } from "react";

export default function GoogleConnectButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setStatus('loading');
    setError(null);
    window.location.href = '/api/integrations/google/auth';
  };

  return (
    <div className="my-4">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded font-bold"
        onClick={handleConnect}
        disabled={status === 'loading' || status === 'connected'}
      >
        {status === 'loading' ? 'Pripájam...' : 'Pripojiť Google účet'}
      </button>
      {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      {status === 'connected' && <div className="text-green-600 text-xs mt-2">Účet pripojený!</div>}
    </div>
  );
}
