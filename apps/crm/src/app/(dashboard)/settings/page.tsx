'use client';
import React from 'react';
import { PushNotificationsToggle } from '@/components/settings/PushNotificationsToggle';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 font-sans" style={{ background: "#050914", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: "#F0F9FF" }}>
          Nastavenia
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
          Správa plánu, notifikácií a preferencií.
        </p>
      </div>

      <div className="space-y-4">
        <section
          className="overflow-hidden rounded-2xl border"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div className="border-b p-4 md:p-6" style={{ borderColor: "#0F1F3D" }}>
            <h3 className="text-base font-bold" style={{ color: "#F0F9FF" }}>Aktuálny plán</h3>
          </div>
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs" style={{ color: "#64748B" }}>Váš program</p>
                <p className="text-lg font-bold uppercase mt-0.5" style={{ color: "#A855F7" }}>Protocol Authority</p>
              </div>
              <button
                className="rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px]"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "#A855F7",
                }}
              >
                Spravovať
              </button>
            </div>
          </div>
        </section>

        <PushNotificationsToggle />

        <section
          className="rounded-2xl border p-4 md:p-6"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <h3 className="mb-3 text-base font-bold" style={{ color: "#F0F9FF" }}>Skúšobné obdobie</h3>
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              background: "rgba(59,130,246,0.08)",
              borderColor: "rgba(59,130,246,0.2)",
              color: "#93C5FD",
            }}
          >
            Vaša ochranná lehota končí o 14 dní.
          </div>
        </section>
      </div>
    </div>
  );
}