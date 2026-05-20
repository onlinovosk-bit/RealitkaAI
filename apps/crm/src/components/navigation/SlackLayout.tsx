'use client';
import React from 'react';

export const SlackLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden antialiased"
      style={{ background: 'linear-gradient(180deg, var(--brand-bg) 0%, #fff 100%)' }}
    >
      <header style={{
        height: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'linear-gradient(90deg, var(--brand) 0%, var(--brand2) 100%)',
        borderBottom: '1px solid rgba(37,99,235,0.2)',
        zIndex: 50,
        flexShrink: 0,
        boxShadow: '0 2px 20px var(--shadow-topbar)',
      }}>
        <div style={{ width: '44px' }} />
        <div style={{ flex: 1, maxWidth: '560px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            padding: '0 12px',
            height: '28px',
            gap: '8px',
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
              Search Revolis Intelligence...
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
        <div style={{ width: '44px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 900,
            color: 'white',
            cursor: 'pointer',
          }}>R</div>
        </div>
      </header>
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'transparent',
        color: 'var(--brand-text)',
      }}>
        {children}
      </main>
    </div>
  );
};