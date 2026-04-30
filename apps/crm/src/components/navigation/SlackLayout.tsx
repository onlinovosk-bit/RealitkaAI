import React from 'react';

type SlackLayoutProps = {
  children: React.ReactNode;
};

export const SlackLayout = ({ children }: SlackLayoutProps) => {
  return (
    <div className="flex h-screen flex-col bg-[#1a1d21] text-[#d1d2d3]">
      {/* 🔍 TOP SEARCH BAR (Lupa a vyhľadávanie) */}
      <div className="flex h-10 items-center justify-center border-b border-white/10 px-4">
        <div className="flex w-1/2 items-center justify-between rounded-md bg-white/10 px-3 py-1 text-sm">
          <span>Search: Revolis Intelligence...</span>
          <kbd className="text-xs opacity-50">⌘K</kbd>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 🛠️ LEVEL 1: NARROW SIDEBAR (Ikony) */}
        <div className="flex w-[70px] flex-col items-center space-y-6 border-r border-white/10 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4a154b] font-bold">R</div>
          <button className="flex flex-col items-center space-y-1 opacity-70 hover:opacity-100">
            <div className="h-6 w-6">🏠</div>
            <span className="text-[10px]">Home</span>
          </button>
          <button className="flex flex-col items-center space-y-1 opacity-70 hover:opacity-100">
            <div className="h-6 w-6">💬</div>
            <span className="text-[10px]">DMs</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-white">
            <div className="h-6 w-6">⚙️</div>
            <span className="text-[10px]">Admin</span>
          </button>
          <div className="flex-1" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">R</div>
        </div>

        {/* 📂 LEVEL 2: CONTEXT SIDEBAR (Kapitoly a rozbaľovanie) */}
        <div className="flex w-[240px] flex-col bg-[#19171d] p-4">
          <h2 className="mb-4 text-lg font-bold text-white">Admin Tools</h2>

          <nav className="space-y-1">
            <div className="group relative">
              <button className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-white/10">
                <span>🤖 Agenti</span>
                <span className="opacity-0 group-hover:opacity-100">›</span>
              </button>
              {/* Floating Submenu na hover */}
              <div className="absolute left-[100%] top-0 z-50 hidden w-48 rounded-md border border-white/10 bg-[#222529] p-2 shadow-xl group-hover:block">
                <div className="px-2 py-1 text-xs font-bold uppercase opacity-50">Kapitoly</div>
                <button className="w-full rounded px-2 py-1 text-left hover:bg-blue-600">Scraper</button>
                <button className="w-full rounded px-2 py-1 text-left hover:bg-blue-600">Scoring</button>
                <button className="w-full rounded px-2 py-1 text-left hover:bg-blue-600">Dravec</button>
              </div>
            </div>

            <button className="flex w-full items-center rounded px-2 py-1 hover:bg-white/10">⚙️ Nastavenia</button>
            <button className="flex w-full items-center rounded px-2 py-1 hover:bg-white/10">📊 Reporty</button>
          </nav>
        </div>

        {/* 📄 MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto bg-white p-8 text-black">
          <div className="rounded-xl border border-gray-200 p-6 shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
};
