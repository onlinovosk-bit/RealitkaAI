"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewContactPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/contacts"
            aria-label="Späť na kontakty"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors duration-200 hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Klientske centrum
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Nový kontakt</h1>
            <p className="text-sm text-slate-600">
              Kontakty sú spravované cez príležitosti, aby obchodný kontext ostal pokope.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-800">Prečo cez príležitosť?</p>
            <p className="mt-2 text-sm leading-6 text-blue-700">
              Klient bez rozpočtu, lokality a časovania maklérovi nepovie, kde sú peniaze
              dnes. Príležitosť uloží kontakt aj obchodný dôvod na ďalší krok.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">1. Kontakt</p>
              <p className="mt-1">Meno, telefón, email.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">2. Dopyt</p>
              <p className="mt-1">Lokalita, rozpočet, typ.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">3. Akcia</p>
              <p className="mt-1">Komu volať ako prvému.</p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-600">
            Pridaj nový kontakt ako príležitosť. Revolis ho následne zobrazí v kontaktoch,
            pipeline aj AI odporúčaniach bez duplicitného zadávania.
          </p>

          <button
            onClick={() => router.push("/leads/new")}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 md:w-auto"
          >
            Pridať príležitosť
          </button>
        </div>
      </div>
    </main>
  );
}
