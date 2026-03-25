'use client';

import { useEffect, useRef, useState } from 'react';

interface GmailSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GmailConfig) => Promise<void>;
  initialValues?: GmailConfig | null;
}

export interface GmailConfig {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
}

export default function GmailSetupModal({
  isOpen,
  onClose,
  onSave,
  initialValues,
}: GmailSetupModalProps) {
  const defaultValues: GmailConfig = {
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<GmailConfig>(defaultValues);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    setError(null);
    setFormData(initialValues ?? defaultValues);
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
      await onSave(formData);
      setFormData(defaultValues);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nepodarilo sa uložiť konfigúráciu'
      );
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
        <h2 className="text-lg font-semibold text-gray-900">
          Nastavenie Gmail IMAP
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Na Gmail musíte zapnúť 2-Factor Authentication a vygenerovať App
          Password.{' '}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700"
          >
            Vygenerovať App Password
          </a>
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              IMAP Server
            </label>
            <input
              type="text"
              value={formData.imapHost}
              onChange={(e) =>
                setFormData({ ...formData, imapHost: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="imap.gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Port
            </label>
            <input
              type="number"
              value={formData.imapPort}
              onChange={(e) =>
                setFormData({ ...formData, imapPort: parseInt(e.target.value) })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="993"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              E-mail (Gmail adresa)
            </label>
            <input
              type="email"
              value={formData.imapUser}
              onChange={(e) =>
                setFormData({ ...formData, imapUser: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="vas.email@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              App Password
            </label>
            <input
              type="password"
              value={formData.imapPassword}
              onChange={(e) =>
                setFormData({ ...formData, imapPassword: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="••••••••••••••••"
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
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ukladám...' : 'Uložiť'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
