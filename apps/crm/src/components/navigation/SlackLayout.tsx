'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type RailItem = {
  href: string;
  label: string;
  title: string;
  icon: React.ReactNode;
};

const RAIL_ITEMS: RailItem[] = [
  {
    href: '/dashboard',
    label: 'Peniaze',
    title: 'Kde mám peniaze dnes?',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5h-5a1.8 1.8 0 0 0 0 3.6h3a1.8 1.8 0 0 1 0 3.6H8" />
        <path d="M12 6.5v11" />
      </>
    ),
  },
  {
    href: '/leads',
    label: 'Volať',
    title: 'Komu volať ako prvému?',
    icon: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    title: 'Kedy inkasujem províziu?',
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </>
    ),
  },
  {
    href: '/tasks',
    label: 'Úlohy',
    title: 'Dnešné rozhodnutia',
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
  {
    href: '/settings',
    label: 'Admin',
    title: 'Nastavenia',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.17A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.17A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9c.28.6.88 1 1.51 1H21a2 2 0 1 1 0 4h-.17A1.65 1.65 0 0 0 19.4 15z" />
      </>
    ),
  },
];

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-brand-bg antialiased"
      style={{ background: 'linear-gradient(180deg, var(--brand-bg) 0%, #fff 100%)' }}
    >
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-[var(--shell-rail)] overflow-y-auto px-2.5 py-3 text-white shadow-[8px_0_32px_var(--shadow-rail)] lg:block"
        style={{ background: 'var(--rail-gradient)' }}
        aria-label="Hlavná navigácia"
      >
        <Link
          href="/dashboard"
          className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/25 bg-white/20 text-base font-extrabold tracking-tight text-white outline-none transition-colors duration-200 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Revolis domov"
        >
          R
        </Link>
        <nav className="flex flex-col gap-1.5">
          {RAIL_ITEMS.map((item) => {
            const active =
              pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.title}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-center text-[9px] font-bold leading-tight outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/80 ${
                  active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header
        className="flex shrink-0 items-center justify-between border-b border-[rgba(37,99,235,0.2)] px-5 shadow-[0_2px_20px_var(--shadow-topbar)] lg:pl-[calc(var(--shell-rail)+20px)]"
        style={{
        height: '56px',
        minHeight: '56px',
        background: 'linear-gradient(90deg, var(--brand) 0%, var(--brand2) 100%)',
        zIndex: 50,
      }}
      >
        <div className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-white/75 lg:block">
          Revolis Workdesk
        </div>
        <div style={{ flex: 1, maxWidth: '520px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            padding: '0 12px',
            height: '36px',
            gap: '8px',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
              Hľadať lead, lokalitu, províziu...
            </span>
            <span style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '1px 5px',
            }}>⌘K</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="hidden h-9 cursor-pointer rounded-xl border-0 bg-cta px-3 text-xs font-bold text-white shadow-sm transition-colors duration-200 hover:bg-cta-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex lg:items-center"
          >
            Spustiť akcie
          </button>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 900,
            color: 'white',
            cursor: 'pointer',
          }}>R</div>
        </div>
      </header>
      <main className="workdesk-main flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto text-brand-text lg:pl-[var(--shell-rail)]">
        {children}
      </main>
    </div>
  );
};