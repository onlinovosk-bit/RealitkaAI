'use client';
import React, { useState } from 'react';

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<'dark' | 'purple'>('dark');
  const topBg = theme === 'dark'
    ? 'linear-gradient(90deg, #06122A 0%, #040B1F 100%)'
    : 'linear-gradient(90deg, #3f0e40 0%, #4a154b 100%)';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden antialiased" style={{ background: '#050914' }}>
      <header style={{ height: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: topBg, borderBottom: '1px solid rgba(34,211,238,0.14)', zIndex: 50, flexShrink: 0 }}>
        <div style={{ width: '44px' }} />
        <div style={{ flex: 1, maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: '8px', padding: '0 12px', height: '28px', gap: '8px' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}><circle cx="6.5" cy="6.5" r="5" stroke="#22D3EE" strokeWidth="1.5"/><path d="M10.5 10.5L14 14" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span style={{ flex: 1, fontSize: '13px', color: 'rgba(203,213,225,0.55)', userSelect: 'none' }}>Search Revolis Intelligence...</span>
            <kbd style={{ fontSize: '10px', color: 'rgba(148,163,184,0.40)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '4px', padding: '1px 5px' }}>⌘K</kbd>
          </div>
        </div>
        <div style={{ width: '44px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setTheme(theme === 'dark' ? 'purple' : 'dark')} style={{ fontSize: '11px', fontWeight: '500', color: 'rgba(203,213,225,0.70)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            {theme === 'dark' ? <><span>🟣</span><span>Purple</span></> : <><span>⚫</span><span>Dark</span></>}
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
};