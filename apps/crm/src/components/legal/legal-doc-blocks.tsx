import type { ReactNode } from "react";

export function LegalSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/10 pt-10 first:border-t-0 first:pt-0">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400/90">{eyebrow}</p>
      ) : null}
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="space-y-6 text-sm leading-relaxed text-white/80">{children}</div>
    </section>
  );
}

export function LegalCallout({
  variant,
  title,
  children,
}: {
  variant: "info" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const border = variant === "warn" ? "border-amber-500/40 bg-amber-500/10" : "border-cyan-500/30 bg-cyan-500/5";
  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      {title ? <p className="mb-2 font-semibold text-white">{title}</p> : null}
      <div className="space-y-2 text-sm text-white/85">{children}</div>
    </div>
  );
}

export function LegalDataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-white/95">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top text-white/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
