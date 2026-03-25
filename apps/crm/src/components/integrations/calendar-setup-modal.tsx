'use client';

import { useEffect, useRef, useState } from 'react';

interface CalendarSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CalendarConfig) => Promise<void>;
  initialValues?: CalendarConfig | null;
}

export interface CalendarConfig {
  calendarIcsUrl: string;
}

export default function CalendarSetupModal({
  isOpen,
  onClose,
  onSave,
  initialValues,
}: CalendarSetupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarIcsUrl, setCalendarIcsUrl] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    setError(null);
    setCalendarIcsUrl(initialValues?.calendarIcsUrl ?? '');
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (!isOpen) return;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        focusableSelector
      );

      if (!focusable || focusable.length === 0) {
        dialogRef.current?.focus();
        return;
      }

      focusable[0].focus();
    };

    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        focusableSelector
      );

      if (!focusable || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, loading, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave({ calendarIcsUrl: calendarIcsUrl.trim() });
      setCalendarIcsUrl('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa ulozit konfiguraciu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-gray-900">Nastavenie Kalendara</h2>
        <p className="mt-2 text-sm text-gray-600">
          Vlozte iCalendar (ICS) URL z Google Calendaru alebo ineho kalendaroveho systemu.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ICS URL</label>
            <input
              type="url"
              value={calendarIcsUrl}
              onChange={(e) => setCalendarIcsUrl(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              required
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Zrusit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ukladam...' : 'Ulozit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
