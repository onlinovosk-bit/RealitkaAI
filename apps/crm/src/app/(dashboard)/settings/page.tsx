'use client';
import React from 'react';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-10 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Nastavenia a SaaS prevádzka</h1>
        <p className="mt-2 text-gray-500">Správa plánu, funkčných prepínačov a limitov.</p>
      </div>

      <div className="space-y-8">
        {/* Sekcia Plán */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 p-6">
            <h3 className="text-lg font-bold">Aktuálny plán</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Váš program</p>
                <p className="text-xl font-bold uppercase text-purple-700">Protocol Authority</p>
              </div>
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black">
                Spravovať predplatné
              </button>
            </div>
          </div>
        </section>

        {/* Sekcia Skúšobné obdobie */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold">Skúšobné obdobie / ochranná lehota</h3>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            Vaša ochranná lehota končí o 14 dní.
          </div>
        </section>
      </div>
    </div>
  );
}
