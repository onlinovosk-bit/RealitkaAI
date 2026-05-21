"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BLOG_PROMO_ITEMS } from "@/lib/blog-articles";
import { isChromelessRoute } from "@/lib/chromeless-routes";

/**
 * Horizontálny pás odkazov. Bez CSS transform na kontajneri odkazov — animovaný posun
 * kazil kliky v niektorých prehliadačoch; jemný horizontal scroll ostáva použiteľný.
 */
export default function BlogPromoTicker() {
  const pathname = usePathname();
  const items = BLOG_PROMO_ITEMS;
  if (items.length === 0) return null;

  const light = isChromelessRoute(pathname);

  return (
    <section
      className={
        light
          ? "relative border-t border-teal-200/80 bg-gradient-to-r from-sky-50 to-teal-50 py-2.5"
          : "relative border-t border-cyan-500/15 bg-slate-950/95 py-2.5"
      }
      aria-label="Odkazy na blog"
    >
      <div
        className={
          light
            ? "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-sky-50 to-transparent"
            : "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-950 to-transparent"
        }
      />
      <div
        className={
          light
            ? "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-teal-50 to-transparent"
            : "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-950 to-transparent"
        }
      />

      <div
        className={`relative z-20 flex items-center gap-4 px-4 text-[11px] uppercase tracking-[0.2em] sm:px-8 ${
          light ? "text-teal-700/70" : "text-slate-500"
        }`}
      >
        <span className={`pointer-events-none shrink-0 font-semibold ${light ? "text-teal-800" : "text-slate-400"}`}>
          Blog
        </span>
        <div className="relative z-20 flex min-w-0 flex-1 items-center gap-3 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:thin]">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className={
                light
                  ? "inline-flex shrink-0 items-center gap-2 rounded-full border border-teal-300/60 bg-white/90 px-4 py-1.5 text-sm font-medium text-teal-900 transition-colors hover:border-teal-400 hover:bg-white"
                  : "inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-500/25 bg-slate-900/80 px-4 py-1.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-slate-800/90"
              }
            >
              <span className={light ? "text-teal-600" : "text-cyan-400"} aria-hidden>
                →
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <Link
          href="/blog"
          className={`relative z-20 shrink-0 text-[11px] font-semibold tracking-normal ${
            light ? "text-teal-700 hover:text-teal-900" : "text-cyan-400 hover:text-cyan-300"
          }`}
        >
          Všetky články
        </Link>
      </div>
    </section>
  );
}
