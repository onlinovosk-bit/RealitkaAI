import { RadiantSpriteIcon } from '@/components/shared/radiant-sprite-icon';

const integrations = [
  { id: 'revolis-ai', label: 'Gmail' },
  { id: 'tasks', label: 'WhatsApp' },
  { id: 'dashboard', label: 'Google Kalendár' },
  { id: 'import', label: 'Import do CRM' },
] as const;

const PORTAL_SITES = 'Nehnuteľnosti.sk · Bazos.sk · Topreality.sk · Reality.sk';

export default function IntegrationsTrustStrip() {
  return (
    <section className="bg-slate-950 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4 md:p-5">
          <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
            Integrácie, ktoré klienti očakávajú
          </p>
          <div className="mb-4 rounded-xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Portály</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{PORTAL_SITES}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-7">
            {integrations.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1.5">
                <RadiantSpriteIcon icon={item.id} sizeClassName="h-5 w-5" className="rounded-md border-cyan-400/20 shadow-none" />
                <span className="text-xs font-medium text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
