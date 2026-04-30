'use client';
import React from 'react';

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Predplatné a licencie</h1>
        <p className="text-gray-500">Spravujte svoj balík a fakturačné údaje pre Reality Monopol.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Karta Aktuálneho Plánu */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">Aktuálny program</h3>
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                PROTOCOL AUTHORITY
              </span>
            </div>
            <span className="text-2xl font-bold">449 €<span className="text-sm font-normal text-gray-500">/mes</span></span>
          </div>
          <button className="w-full rounded-md bg-[#4a154b] py-2 text-white transition hover:bg-[#3f0e40]">
            Spravovať v Stripe
          </button>
        </div>

        {/* Karta Štatistík */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Využitie zdrojov</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>AI Tokeny</span>
                <span>85%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-purple-600" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
