'use client'

type UserRole = 'owner' | 'agent' | 'senior' | string

interface TopBarProps {
  userName?: string
  role?: UserRole
  title?: string
  subtitle?: string
  onAlertClick?: () => void
}

export function TopBar({ userName, role, title, subtitle, onAlertClick }: TopBarProps) {
  const displayTitle = title ?? userName ?? 'Revolis.AI'
  const displaySubtitle = subtitle ?? ''

  return (
    <header style={{
      height:         'var(--topbar-h)',
      background:     'var(--surface-card)',
      borderBottom:   '1px solid var(--border-light)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 22px',
      flexShrink:     0,
      position:       'sticky',
      top:            0,
      zIndex:         40,
    }}>
      {/* Title */}
      <div>
        <h1 style={{
          fontSize:      15,
          fontWeight:    700,
          color:         'var(--text-primary)',
          lineHeight:    1.2,
        }}>{displayTitle}</h1>
        <p style={{
          fontSize: 10,
          color:    'var(--text-secondary)',
          marginTop: 1,
        }}>{displaySubtitle}</p>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Status */}
        <div style={{
          display:     'flex', alignItems: 'center', gap: 5,
          padding:     '4px 10px',
          background:  'var(--success-bg)',
          borderRadius: 20,
          border:      '0.5px solid var(--success-bd)',
          fontSize:    11, color: 'var(--success)',
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--success)',
          }} />
          Prešov online
        </div>

        {/* Alerts */}
        <button
          onClick={onAlertClick}
          style={{
            padding:      '4px 12px',
            background:   'var(--warn-bg)',
            border:       '1px solid var(--gold-400)',
            borderRadius: 7,
            fontSize:     11,
            fontWeight:   700,
            color:        '#92400E',
            cursor:       'pointer',
            fontFamily:   'var(--font-body)',
            transition:   'opacity var(--t-fast)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ⚠ 3 alerty
        </button>

        {/* Avatar */}
        <div style={{
          width:         30, height: 30,
          borderRadius:  7,
          background:    'var(--navy-100)',
          border:        '1px solid var(--border-light)',
          display:       'flex', alignItems: 'center', justifyContent: 'center',
          fontSize:      11, fontWeight: 800,
          color:         'var(--navy-800)',
          cursor:        'pointer',
        }}>{(userName?.slice(0, 2) ?? role?.slice(0, 2) ?? 'RS').toUpperCase()}</div>
      </div>
    </header>
  )
}
