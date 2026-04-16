import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_ARTICLES, BLOG_SLUGS } from "@/lib/blog-articles";

export function generateStaticParams() {
  return BLOG_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = BLOG_ARTICLES[slug];
  if (!article) return { title: "Článok – Revolis.AI" };
  return {
    title: `${article.title} – Revolis.AI`,
    description: article.description,
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = BLOG_ARTICLES[slug];
  if (!article) notFound();

  return (
    <article className="min-h-screen bg-slate-950 px-4 py-16 text-slate-50 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Blog</p>
        <h1 className="mt-3 font-sans text-3xl font-bold leading-tight tracking-tight text-slate-50 sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-slate-400">{article.description}</p>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-slate-300">
          {article.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 border-t border-slate-800 pt-10 text-sm">
          <Link href="/blog" className="font-medium text-cyan-400 hover:text-cyan-300">
            ← Všetky články
          </Link>
          <Link href="/" className="text-slate-500 hover:text-slate-300">
            Úvodná stránka
          </Link>
        </div>
      </div>
    </article>
  );
}
