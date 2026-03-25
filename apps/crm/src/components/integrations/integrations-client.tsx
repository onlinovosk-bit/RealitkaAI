'use client';

import { useEffect, useRef, useState } from 'react';
import GmailSetupModal, {
  type GmailConfig,
} from '@/components/integrations/gmail-setup-modal';
import CalendarSetupModal, {
  type CalendarConfig,
} from '@/components/integrations/calendar-setup-modal';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
}

type IntegrationStatus = {
  connected: boolean;
  lastSynced?: string;
};

type DisconnectTarget = {
  id: 'gmail' | 'calendar';
  name: string;
} | null;

const integrations: Integration[] = [
  {
    id: 'gmail',
    name: 'Gmail - IMAP',
    description: 'Synchronizujte e-maily a spravy z vaseho Gmail uctu',
    icon: '✉️',
  },
  {
    id: 'calendar',
    name: 'Kalendar',
    description: 'Synchronizujte kalendarne udaje z iCalendar (ICS)',
    icon: '📅',
  },
];

const defaultIntegrationStatus: Record<string, IntegrationStatus> = {
  gmail: { connected: false },
  calendar: { connected: false },
};

function formatLastSynced(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat('sk-SK', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function IntegrationsClient() {
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [gmailInitialValues, setGmailInitialValues] = useState<
    GmailConfig | null
  >(null);
  const [calendarInitialValues, setCalendarInitialValues] = useState<
    CalendarConfig | null
  >(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<
    Record<string, IntegrationStatus>
  >(defaultIntegrationStatus);
  const [disconnectTarget, setDisconnectTarget] =
    useState<DisconnectTarget>(null);
  const disconnectDialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!disconnectTarget) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const focusable = disconnectDialogRef.current?.querySelectorAll<HTMLElement>(
        focusableSelector
      );

      if (!focusable || focusable.length === 0) {
        disconnectDialogRef.current?.focus();
        return;
      }

      focusable[0].focus();
    };

    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        setDisconnectTarget(null);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = disconnectDialogRef.current?.querySelectorAll<HTMLElement>(
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
  }, [disconnectTarget, saving]);

  useEffect(() => {
    const loadStatuses = async () => {
      setLoadingStatuses(true);
      try {
        const [gmailResponse, calendarResponse] = await Promise.all([
          fetch('/api/integrations/gmail'),
          fetch('/api/integrations/calendar'),
        ]);

        const nextStatuses = { ...defaultIntegrationStatus };

        if (gmailResponse.ok) {
          const gmailPayload = await gmailResponse.json();
          if (gmailPayload.integration) {
            nextStatuses.gmail = {
              connected: true,
              lastSynced: gmailPayload.integration.updatedAt,
            };
          }
        }

        if (calendarResponse.ok) {
          const calendarPayload = await calendarResponse.json();
          if (calendarPayload.integration) {
            nextStatuses.calendar = {
              connected: true,
              lastSynced: calendarPayload.integration.updatedAt,
            };
          }
        }

        setIntegrationStatuses(nextStatuses);
      } catch {
      } finally {
        setLoadingStatuses(false);
      }
    };

    loadStatuses();
  }, []);

  const openGmailModal = async () => {
    setLoadingPrefill(true);
    try {
      const response = await fetch('/api/integrations/gmail');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba pri nacitani konfiguracie');
      }

      const payload = await response.json();
      if (payload.integration) {
        setGmailInitialValues({
          imapHost: payload.integration.imapHost || 'imap.gmail.com',
          imapPort: Number(payload.integration.imapPort) || 993,
          imapUser: payload.integration.imapUser || '',
          imapPassword: payload.integration.imapPassword || '',
        });
      } else {
        setGmailInitialValues({
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapUser: '',
          imapPassword: '',
        });
      }

      setIsGmailModalOpen(true);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Neznama chyba pri nacitani'
      );
    } finally {
      setLoadingPrefill(false);
    }
  };

  const openCalendarModal = async () => {
    setLoadingPrefill(true);
    try {
      const response = await fetch('/api/integrations/calendar');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba pri nacitani konfiguracie');
      }

      const payload = await response.json();
      if (payload.integration) {
        setCalendarInitialValues({
          calendarIcsUrl: payload.integration.calendarIcsUrl || '',
        });
      } else {
        setCalendarInitialValues({ calendarIcsUrl: '' });
      }

      setIsCalendarModalOpen(true);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Neznama chyba pri nacitani'
      );
    } finally {
      setLoadingPrefill(false);
    }
  };

  const handleGmailSetup = async (config: GmailConfig) => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba pri ukladani');
      }

      const payload = await response.json();
      setIntegrationStatuses((prev) => ({
        ...prev,
        gmail: {
          connected: true,
          lastSynced: payload.integration?.updatedAt,
        },
      }));

      alert('Gmail konfiguracia bola uspesne ulozena!');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Neznama chyba');
    } finally {
      setSaving(false);
    }
  };

  const handleCalendarSetup = async (config: CalendarConfig) => {
    setSaving(true);
    try {
      const response = await fetch('/api/integrations/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba pri ukladani');
      }

      const payload = await response.json();
      setIntegrationStatuses((prev) => ({
        ...prev,
        calendar: {
          connected: true,
          lastSynced: payload.integration?.updatedAt,
        },
      }));

      alert('Kalendar konfiguracia bola uspesne ulozena!');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Neznama chyba');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (
    integrationId: 'gmail' | 'calendar',
    integrationName: string
  ) => {
    setDisconnectTarget({ id: integrationId, name: integrationName });
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;

    setSaving(true);
    try {
      const endpoint =
        disconnectTarget.id === 'gmail'
          ? '/api/integrations/gmail'
          : '/api/integrations/calendar';

      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chyba pri odpajani');
      }

      setIntegrationStatuses((prev) => ({
        ...prev,
        [disconnectTarget.id]: {
          connected: false,
          lastSynced: undefined,
        },
      }));

      if (disconnectTarget.id === 'gmail') {
        setGmailInitialValues({
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapUser: '',
          imapPassword: '',
        });
      } else {
        setCalendarInitialValues({ calendarIcsUrl: '' });
      }

      alert('Integracia bola odpojena.');
      setDisconnectTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Neznama chyba');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid gap-6">
        {integrations.map((integration) => {
          const status =
            integrationStatuses[integration.id] || { connected: false };
          const lastSynced = formatLastSynced(status.lastSynced);

          return (
          <div
            key={integration.id}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{integration.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {integration.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {integration.description}
                  </p>
                  {lastSynced && (
                    <p className="mt-2 text-xs text-gray-500">
                      Posledne synchronizovane: {lastSynced}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    status.connected
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {status.connected
                    ? 'Pripojene'
                    : 'Nepripojene'}
                </span>
                <button
                  onClick={async () => {
                    if (integration.id === 'gmail') {
                      await openGmailModal();
                      return;
                    }

                    if (integration.id === 'calendar') {
                      await openCalendarModal();
                    }
                  }}
                  disabled={saving || loadingPrefill || loadingStatuses}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ⚙️
                  {loadingPrefill || loadingStatuses
                    ? 'Nacitavam...'
                    : status.connected
                      ? 'Nastavit'
                      : 'Pripojit'}
                </button>
                {status.connected && (
                  <button
                    onClick={async () => {
                      await handleDisconnect(
                        integration.id as 'gmail' | 'calendar',
                        integration.name
                      );
                    }}
                    disabled={saving || loadingPrefill || loadingStatuses}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Odpojit
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
      <GmailSetupModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onSave={handleGmailSetup}
        initialValues={gmailInitialValues}
      />
      <CalendarSetupModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onSave={handleCalendarSetup}
        initialValues={calendarInitialValues}
      />
      {disconnectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setDisconnectTarget(null);
            }
          }}
        >
          <div
            ref={disconnectDialogRef}
            tabIndex={-1}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Potvrdit odpojenie
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Naozaj chcete odpojit integraciu {disconnectTarget.name}? Tento krok
              moze sposobit, ze sa prestanu nacitavat nove data.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDisconnectTarget(null)}
                disabled={saving}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Zrusit
              </button>
              <button
                type="button"
                onClick={confirmDisconnect}
                disabled={saving}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Odpajam...' : 'Ano, odpojit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
