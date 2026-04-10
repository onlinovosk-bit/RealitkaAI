import { useState } from "react";

export default function GoogleCalendarDemo() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleCreateEvent = async () => {
    setStatus('loading');
    setError(null);
    // Demo: call backend endpoint (to be implemented)
    const res = await fetch('/api/integrations/google/calendar-demo', { method: 'POST' });
    if (res.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setError('Nepodarilo sa vytvoriť udalosť.');
    }
  };

  return (
    <div className="my-4">
      <button
        className="px-4 py-2 bg-green-600 text-white rounded font-bold"
        onClick={handleCreateEvent}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Vytváram...' : 'Vytvoriť demo udalosť v Google Kalendári'}
      </button>
      {status === 'success' && <div className="text-green-600 text-xs mt-2">Udalosť bola vytvorená!</div>}
      {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
    </div>
  );
}
