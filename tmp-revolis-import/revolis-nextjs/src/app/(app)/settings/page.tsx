import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nastavenia — Revolis.AI' }

const SECTIONS = [
  {
    title: 'Portálové integrácie',
    desc: 'XML feedy, CSV importy a automatická synchronizácia',
    icon: '🔀',
    items: [
      { label: 'Nehnuteľnosti.sk', status: 'Aktívny', color: '#059669' },
      { label: 'Bazoš.sk RSS',     status: 'Aktívny', color: '#059669' },
      { label: 'Reality.sk',       status: 'Čakajúci', color: '#D97706' },
      { label: 'TopReality.sk',    status: 'Vypnutý',  color: '#94A3B8' },
    ],
  },
  {
    title: 'Notifikácie',
    desc: 'E-mail alerty, push notifikácie a Morning Brief',
    icon: '🔔',
    items: [
      { label: 'Morning Brief 08:00', status: 'Aktívny', color: '#059669' },
      { label: 'BRI Hot alerts',      status: 'Aktívny', color: '#059669' },
      { label: 'LV Kataster alerty',  status: 'Aktívny', color: '#059669' },
      { label: 'Web push (mobil)',    status: 'Vypnutý',  color: '#94A3B8' },
    ],
  },
  {
    title: 'GDPR & Bezpečnosť',
    desc: 'DPO kontakt, súhlas a audit logy',
    icon: '🛡️',
    items: [
      { label: 'DPO: dpo@revolis.ai',        status: 'Nastavený', color: '#059669' },
      { label: 'Cookie Policy',              status: 'Aktívna',   color: '#059669' },
      { label: 'Audit log (365 dní)',         status: 'Aktívny',   color: '#059669' },
      { label: 'Data export pre klienta',    status: 'Dostupný',  color: '#2563EB' },
    ],
  },
  {
    title: 'API & Integrácie',
    desc: 'API kľúče, webhooky a B2B data feed',
    icon: '🔌',
    items: [
      { label: 'API kľúč',         status: 'Vygenerovaný', color: '#059669' },
      { label: 'Webhook URL',      status: 'Nenastavený',  color: '#94A3B8' },
      { label: 'B2B Data API',     status: 'Protocol only', color: '#D97706' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <>
      {SECTIONS.map(section => (
        <div key={section.title} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{section.icon}</span>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{section.desc}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.items.map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', background: 'var(--surface-input)',
                borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-light)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: item.color }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
