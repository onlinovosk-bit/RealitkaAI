"use client";

import Link from "next/link";
import { BLOG_PROMO_ITEMS } from "@/lib/blog-articles";

/**
 * Horizontálny pás odkazov. Bez CSS transform na kontajneri odkazov — animovaný posun
 * kazil kliky v niektorých prehliadačoch; jemný horizontal scroll ostáva použiteľný.
 */
export default function BlogPromoTicker() {
  const items = BLOG_PROMO_ITEMS;
  if (items.length === 0) return null;

  return (
    <section
      className="relative border-t border-cyan-500/15 bg-slate-950/95 py-2.5"
      aria-label="Odkazy na blog"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-950 to-transparent" />

      <div className="relative z-20 flex items-center gap-4 px-4 text-[11px] uppercase tracking-[0.2em] text-slate-500 sm:px-8">
        <span className="pointer-events-none shrink-0 font-semibold text-slate-400">Blog</span>
        <div className="relative z-20 flex min-w-0 flex-1 items-center gap-3 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:thin]">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-500/25 bg-slate-900/80 px-4 py-1.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-slate-800/90"
            >
              <span className="text-cyan-400" aria-hidden>
                →
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <Link
          href="/blog"
          className="relative z-20 shrink-0 text-[11px] font-semibold tracking-normal text-cyan-400 hover:text-cyan-300"
        >
          Všetky články
        </Link>
      </div>
    </section>
  );
}
