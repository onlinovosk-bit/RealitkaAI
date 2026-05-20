import Link from "next/link";

import ErrorState from "@/components/shared/error-state";
import ModuleShell from "@/components/shared/module-shell";
import { listLeads, type Lead, type LeadStatus } from "@/lib/leads-store";
import { safeServerAction } from "@/lib/safe-action";

type ContactsPageProps = {
  searchParams: Promise<{ scope?: string }>;
};

const statusStyles: Record<LeadStatus, string> = {
  Nový: "border-blue-200 bg-blue-50 text-blue-700",
  Teplý: "border-amber-200 bg-amber-50 text-amber-700",
  Horúci: "border-red-200 bg-red-50 text-red-700",
  Obhliadka: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Ponuka: "border-orange-200 bg-orange-50 text-orange-700",
};

function formatScoreLabel(lead: Lead) {
  const readiness = lead.buyer_readiness_score ?? lead.score;
  return `${readiness} BRI`;
}

function ContactCard({ lead }: { lead: Lead }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50/30 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-950">{lead.name}</h2>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyles[lead.status]}`}
            >
              {lead.status}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {lead.location} · {lead.propertyType} · {lead.budget}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {lead.note || "Bez poznámky. Doplň kontext pri najbližšom kontakte."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-end">
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            {formatScoreLabel(lead)}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {lead.lastContact || "Bez kontaktu"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Telefón</p>
          <p className="mt-1 font-semibold text-slate-800">{lead.phone}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Email</p>
          <p className="mt-1 truncate font-semibold text-slate-800">{lead.email}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Maklér</p>
          <p className="mt-1 font-semibold text-slate-800">{lead.assignedAgent}</p>
        </div>
      </div>
    </article>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  valueClass,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>
    </div>
  );
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const isSharedScope = params.scope === "shared";

  const result = await safeServerAction(
    () => listLeads(),
    "Nepodarilo sa načítať klientov."
  );

  if (!result.ok) {
    return (
      <ModuleShell
        title={isSharedScope ? "Klienti kancelárie" : "Moji klienti"}
        description="Kontakty, história a ďalší najlepší krok v jednom prehľade."
      >
        <ErrorState
          title="Klientov sa nepodarilo načítať"
          description={result.error}
        />
      </ModuleShell>
    );
  }

  const contacts = result.data;
  const hotCount = contacts.filter((lead) => lead.status === "Horúci").length;
  const showingCount = contacts.filter((lead) => lead.status === "Obhliadka").length;
  const averageScore = contacts.length
    ? Math.round(contacts.reduce((sum, lead) => sum + lead.score, 0) / contacts.length)
    : 0;

  return (
    <ModuleShell
      title={isSharedScope ? "Klienti kancelárie" : "Moji klienti"}
      description="Kontakty, história a ďalší najlepší krok v jednom prehľade."
    >
      {isSharedScope && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
          Zobrazujú sa zdieľaní klienti kancelárie pripravení na tímový follow-up.
        </div>
      )}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Klientske centrum
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Komu volať ako prvému?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Prehľad kontaktov je zoradený pre makléra: záujem, posledný kontakt,
              BRI a najbližší obchodný krok bez prepínania medzi modulmi.
            </p>
          </div>
          <Link
            href="/contacts/new"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Pridať klienta
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-2 md:gap-4 xl:grid-cols-4">
        <StatCard
          title="Všetci klienti"
          value={contacts.length}
          subtitle="Aktívna databáza"
          valueClass="text-blue-700"
        />
        <StatCard
          title="Horúci klienti"
          value={hotCount}
          subtitle="Najvyššia priorita"
          valueClass="text-red-600"
        />
        <StatCard
          title="Obhliadky"
          value={showingCount}
          subtitle="Krok k provízii"
          valueClass="text-emerald-700"
        />
        <StatCard
          title="Priemerný BRI"
          value={averageScore}
          subtitle="Kde mám peniaze dnes?"
          valueClass="text-orange-600"
        />
      </section>

      <section className="grid gap-3">
        {contacts.map((lead) => (
          <ContactCard key={lead.id} lead={lead} />
        ))}
        {contacts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-lg font-bold text-slate-950">Zatiaľ žiadni klienti</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pridaj prvú príležitosť a Revolis z nej vytvorí klientsky kontext.
            </p>
          </div>
        )}
      </section>
    </ModuleShell>
  );
}
