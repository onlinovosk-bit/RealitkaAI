'use client';

import React, { useState } from 'react';

type SlackLayoutProps = {
  children: React.ReactNode;
};

export const SlackLayout = ({ children }: SlackLayoutProps) => {
  const [theme, setTheme] = useState<'dark' | 'purple'>('dark');

  const themes = {
    dark: { bg: '#1a1d21', sidebar: '#19171d', text: '#d1d2d3', active: '#222529' },
    purple: { bg: '#4a154b', sidebar: '#3f0e40', text: '#ffffff', active: '#1164a3' }
  };

  const current = themes[theme];

  return (
    <div className="flex h-screen flex-col transition-colors duration-300" style={{ backgroundColor: current.bg, color: current.text }}>
      {/* 🔍 TOP SEARCH BAR */}
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-4">
        <div className="flex flex-1 justify-center">
          <div className="flex w-1/2 items-center justify-between rounded-md bg-white/10 px-3 py-1 text-sm">
            <span>Search: Revolis Intelligence...</span>
            <kbd className="text-xs opacity-50">⌘K</kbd>
          </div>
        </div>
        {/* 🌗 THEME TOGGLE */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'purple' : 'dark')}
          className="ml-4 rounded bg-white/10 px-2 py-1 text-xs transition hover:bg-white/20"
        >
          {theme === 'dark' ? '🟣 Purple Mode' : '⚫ Dark Mode'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEVEL 1 SIDEBAR */}
        <div className="flex w-[70px] flex-col items-center space-y-6 border-r border-white/10 py-4" style={{ backgroundColor: current.sidebar }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-[#4a154b] font-bold">R</div>
          <div className="space-y-6 opacity-70">
            <button className="h-6 w-6">🏠</button>
            <button className="h-6 w-6">💬</button>
            <button className="h-6 w-6">📊</button>
          </div>
        </div>

        {/* LEVEL 2 SIDEBAR */}
        <div className="flex w-[240px] flex-col p-4" style={{ backgroundColor: current.sidebar }}>
          <h2 className="mb-4 text-lg font-bold">Revolis Admin</h2>
          <nav className="space-y-1">
            <button className="w-full rounded px-2 py-1 text-left hover:bg-white/10">🤖 Agenti</button>
            <button className="w-full rounded px-2 py-1 text-left hover:bg-white/10" style={{ backgroundColor: current.active }}>🛡️ Strážca Cien</button>
            <button className="w-full rounded px-2 py-1 text-left hover:bg-white/10">📊 Reporty</button>
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto bg-[#f8f8f8] p-8 text-black">
          <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {children}
          </div>
        </main>
      </div>

      {/* 🏎️ FAST SCROLLING TICKER (Zrýchlené o 0.1s / o 10%) */}
      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .ticker-fast {
          display: flex;
          animation: scroll 18s linear infinite; /* Pôvodne 20s, teraz 18s (rýchlejšie) */
        }
      `}</style>
    </div>
  );
};
