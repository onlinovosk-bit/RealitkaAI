"use client";
import Link from "next/link";

export default function QuickActionsBar() {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <Link
        href="/leads?action=new"
        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
      >
        + Pridať príležitosť
      </Link>
      <Link
        href="/leads?filter=showing"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        📅 Obhliadky dnes
      </Link>
      <Link
        href="/leads?filter=hot"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        🔥 Horúce príležitosti
      </Link>
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        📊 Stav klientov
      </Link>
    </div>
  );
}
