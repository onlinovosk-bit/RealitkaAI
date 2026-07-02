'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { isChromelessRoute } from '@/lib/chromeless-routes';
import { isWorkdeskRoute } from '@/lib/workdesk-routes';
import { SLATE_HORIZON } from '@/lib/slate-horizon-theme';

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // usePathname() is null on the first client pass while SSR already resolved the route —
  // render passthrough so /login chromeless SSR matches hydration (avoids double chrome).
  if (!pathname) {
    return <>{children}</>;
  }

  if (isChromelessRoute(pathname)) {
    return <>{children}</>;
  }

  const workdesk = isWorkdeskRoute(pathname);

  if (workdesk) {
    return (
      <div
        className="flex h-screen w-full overflow-hidden antialiased"
        style={{ background: SLATE_HORIZON.bg }}
        data-theme="slate-horizon"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden antialiased"
      style={{ background: SLATE_HORIZON.bg }}
      data-theme="slate-horizon"
    >
      <header
        style={{
          height: '56px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: SLATE_HORIZON.topbarGradient,
          boxShadow: '0 2px 16px rgba(37,99,235,0.25)',
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        <div style={{ width: '44px' }} aria-hidden />
        <div style={{ flex: 1, maxWidth: '480px', margin: '0 auto' }}>
          <label htmlFor="revolis-global-search" className="sr-only">
            Hľadať lead, lokalitu, províziu
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: '10px',
              padding: '0 14px',
              height: '36px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.75 }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="#fff" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span
              id="revolis-global-search"
              style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.85)', userSelect: 'none' }}
            >
              Hľadať lead, lokalitu, províziu…
            </span>
            <kbd
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: '4px',
                padding: '1px 5px',
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
        <div style={{ width: '44px', display: 'flex', justifyContent: 'flex-end' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            Workdesk
          </span>
        </div>
      </header>
      <div className="flex flex-1 overflow-y-auto md:overflow-hidden">{children}</div>
    </div>
  );
};
