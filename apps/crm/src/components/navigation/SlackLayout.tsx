'use client';

import React, { useState } from 'react';

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState('dark');
  const current = theme === 'dark' ? { bg: '#1a1d21', sidebar: '#19171d', text: '#d1d2d3' } : { bg: '#4a154b', sidebar: '#3f0e40', text: '#ffffff' };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden font-sans antialiased" style={{ backgroundColor: current.bg, color: current.text }}>
      {/* 🔍 TOP SEARCH BAR */}
      <div className="flex h-12 shrink-0 items-center border-b border-white/10 px-4">
        <div className="flex flex-1 justify-center">
          <div className="flex w-[600px] items-center justify-between rounded-md border border-white/5 bg-white/10 px-3 py-1.5 text-sm">
            <span>Search Revolis Intelligence...</span>
            <kbd className="text-[10px] opacity-40">⌘K</kbd>
          </div>
        </div>
        <button onClick={() => setTheme(theme === 'dark' ? 'purple' : 'dark')} className="rounded-md bg-white/10 px-3 py-1 text-xs transition hover:bg-white/20">
          {theme === 'dark' ? '🟣 Purple' : '⚫ Dark'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEVEL 1: NARROW SIDEBAR */}
        <div className="flex w-[68px] shrink-0 flex-col items-center gap-6 border-r border-white/10 py-4" style={{ backgroundColor: current.sidebar }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg">R</div>
          <div className="flex flex-col gap-6 opacity-60">
            <button className="text-xl transition hover:scale-110">🏠</button>
            <button className="text-xl transition hover:scale-110">💬</button>
            <button className="text-xl transition hover:scale-110">🔔</button>
          </div>
        </div>

        {/* LEVEL 2: CONTEXT SIDEBAR */}
        <div className="flex w-[260px] shrink-0 flex-col border-r border-white/10 p-4" style={{ backgroundColor: current.sidebar }}>
          <h2 className="mb-6 px-2 text-xl font-black tracking-tight text-white">Revolis Admin</h2>
          <nav className="flex flex-col gap-1 text-sm font-medium">
            <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10">🤖 Agenti</div>
            <div className="flex cursor-pointer items-center gap-2 rounded bg-white/10 px-2 py-1.5 text-white">🛡️ Strážca Cien</div>
            <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10">📊 Reporty</div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest opacity-40">Nastavenia</div>
              <div className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10">Predplatné</div>
            </div>
          </nav>
        </div>

        {/* MAIN CONTENT - BIELY AKO SLACK */}
        <main className="flex-1 overflow-y-auto bg-white text-gray-900">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
