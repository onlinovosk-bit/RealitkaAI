import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="sk">
      <body style={{
        margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#F2F6FA', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#fff', border: '0.5px solid #D6E2EF',
          borderRadius: 10, padding: '48px 40px', maxWidth: 440,
          textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.06)',
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 18, fontWeight: 800, color: '#1B3A5C',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
              }}>R</div>
              Revolis<span style={{ color: '#F5C518' }}>.AI</span>
            </div>
          </div>

          {/* 404 badge */}
          <div style={{
            display: 'inline-block', padding: '4px 14px',
            background: '#FEF2F2', border: '0.5px solid #FECACA',
            borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: '#991B1B', marginBottom: 16,
          }}>
            404 — Stránka nenájdená
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0C1B2D', marginBottom: 8 }}>
            Táto stránka neexistuje
          </h1>
          <p style={{ fontSize: 13, color: '#7A8BA8', lineHeight: 1.6, marginBottom: 28 }}>
            Adresa <code style={{
              background: '#F2F6FA', padding: '2px 6px',
              borderRadius: 4, fontSize: 11, color: '#1B3A5C',
            }}>app.revolis.ai/team/permissions</code> alebo iná stránka, ktorú hľadáte, nebola nájdená.
          </p>

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[
              { href: '/dashboard',         label: 'Dashboard — Kde sú peniaze dnes' },
              { href: '/team',              label: 'Tím výkonnosť' },
              { href: '/team/permissions',  label: 'Oprávnenia tímu' },
              { href: '/billing',           label: 'Predplatné a licencie' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                padding: '9px 14px', background: '#F2F6FA',
                borderRadius: 8, fontSize: 12, fontWeight: 500,
                color: '#1B3A5C', textDecoration: 'none',
                border: '0.5px solid #D6E2EF',
                transition: 'background 0.12s',
              }}>
                {link.label} →
              </Link>
            ))}
          </div>

          <Link href="/dashboard" style={{
            display: 'inline-block', padding: '10px 28px',
            background: '#1B3A5C', borderRadius: 8,
            fontSize: 13, fontWeight: 700, color: '#fff',
            textDecoration: 'none',
          }}>
            Ísť na Dashboard
          </Link>
        </div>
      </body>
    </html>
  )
}
