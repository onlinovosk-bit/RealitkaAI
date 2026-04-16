import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Legal Changelog | Revolis.AI",
  description: "Verzionovaný prehľad zmien právnych a compliance dokumentov Revolis.AI.",
};

const releases = [
  {
    version: "v2.3",
    date: "15. apríla 2026",
    items: [
      "Public legal pages (Legal Hub, Privacy, Terms, Security) live.",
      "DPA request self-service flow + Trust Center route.",
      "Cookie policy + consent banner nasadené.",
      "Service status page + incident communication standard.",
    ],
  },
  {
    version: "v2.2",
    date: "15. apríla 2026",
    items: [
      "Annex E/F/G/H doplnené do legal stacku.",
      "Cross-reference alignment naprieč MSA, DPA, SLA, VOP.",
      "RACI implementation plan + procurement trust-center pack.",
    ],
  },
  {
    version: "v2.1",
    date: "15. apríla 2026",
    items: [
      "Redline-ready enterprise články doplnené do core dokumentov.",
      "AI governance, kill switch, fallback a reputačná ochrana posilnené.",
    ],
  },
];

export default function LegalChangelogPage() {
  return (
    <LegalPageShell title="Legal Changelog" subtitle="Transparentná história významných legal/compliance zmien.">
      <div className="space-y-4">
        {releases.map((release) => (
          <section key={release.version} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-300">
              {release.version} · {release.date}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {release.items.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LegalPageShell>
  );
}
