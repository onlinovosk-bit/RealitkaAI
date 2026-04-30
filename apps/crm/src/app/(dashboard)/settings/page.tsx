'use client';
import React from 'react';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl p-10 font-sans">
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-gray-100">
          Nastavenia a SaaS prevádzka
        </h1>
        <p className="mt-2 text-gray-400">
          Správa plánu, funkčných prepínačov a limitov.
        </p>
      </div>

      <div className="space-y-8">
        <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-sm">
          <div className="border-b border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-bold text-gray-100">Aktuálny plán</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Váš program</p>
                <p className="text-xl font-bold uppercase text-purple-400">Protocol Authority</p>
              </div>
              <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700">
                Spravovať predplatné
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-gray-100">Skúšobné obdobie</h3>
          <div className="rounded-lg border border-blue-800 bg-blue-900/30 p-4 text-sm text-blue-300">
            Vaša ochranná lehota končí o 14 dní.
          </div>
        </section>
      </div>
    </div>
  );
}