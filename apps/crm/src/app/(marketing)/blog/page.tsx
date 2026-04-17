import Link from "next/link";
import { BLOG_SLUGS, BLOG_ARTICLES } from "@/lib/blog-articles";

export const metadata = {
  title: "Blog – Revolis.AI",
  description: "Prečo sa oplatí spolupráca s Revolis.AI a ako začať bez chaosu.",
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-50 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Revolis.AI</p>
        <h1 className="mt-2 font-sans text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          Blog
        </h1>
        <p className="mt-3 text-slate-400">
          Krátke články pre vedenie a maklérov — prečo má spolupráca význam a čo očakávať prvé týždne.
        </p>

        <ul className="mt-10 space-y-4">
          {BLOG_SLUGS.map((slug) => {
            const a = BLOG_ARTICLES[slug];
            return (
              <li key={slug}>
                <Link
                  href={`/blog/${slug}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-cyan-500/30 hover:bg-slate-900"
                >
                  <h2 className="text-lg font-semibold text-cyan-100">{a.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{a.description}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-cyan-400">Čítať →</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-14 text-center text-sm text-slate-500">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            ← Späť na úvod
          </Link>
        </p>
      </div>
    </main>
  );
}
