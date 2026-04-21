"use client";
import Link from "next/link";
import { RadiantSpriteIcon } from "@/components/shared/radiant-sprite-icon";

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
        <RadiantSpriteIcon icon="tasks" sizeClassName="h-4 w-4" className="rounded-sm border-transparent shadow-none" />
        Obhliadky dnes
      </Link>
      <Link
        href="/leads?filter=hot"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <RadiantSpriteIcon icon="leads" sizeClassName="h-4 w-4" className="rounded-sm border-transparent shadow-none" />
        Horúce príležitosti
      </Link>
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <RadiantSpriteIcon icon="pipeline" sizeClassName="h-4 w-4" className="rounded-sm border-transparent shadow-none" />
        Stav klientov
      </Link>
    </div>
  );
}
