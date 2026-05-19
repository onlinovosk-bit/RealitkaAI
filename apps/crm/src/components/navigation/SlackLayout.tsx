'use client';

import React from 'react';

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden antialiased bg-gradient-to-b from-brand-bg to-white">
      <div
        className="pointer-events-none absolute right-0 top-0 z-40 h-full w-1 bg-rail"
        aria-hidden
      />

      <header className="z-50 flex h-11 shrink-0 items-center justify-between border-b border-brand-line bg-white/85 px-4 backdrop-blur-sm">
        <div className="w-11" />

        <div className="mx-auto w-full max-w-[560px] flex-1">
          <div className="flex h-7 items-center justify-between gap-2 rounded-lg border border-brand-line bg-purple-soft/60 px-3">
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0 text-purple opacity-60"
              aria-hidden
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="flex-1 select-none text-[13px] text-brand-muted">
              Search Revolis Intelligence...
            </span>
            <kbd className="rounded border border-brand-line bg-white/80 px-1.5 py-px text-[10px] text-brand-muted">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex w-11 items-center justify-end">
          <span className="rounded-md border border-brand-line bg-purple-soft px-2 py-0.5 text-[11px] font-semibold text-purple-deep">
            v2
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-y-auto text-brand-deep md:overflow-hidden">{children}</div>
    </div>
  );
};
