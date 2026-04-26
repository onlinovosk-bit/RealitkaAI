// ================================================================
// Revolis.AI — BRI Live Score Demo Page
// Route: /leads/bri-demo
// For development/demo purposes — remove before production
// ================================================================
import { BRILiveScore } from '@/components/bri'

// Replace with real IDs from your Supabase data
const DEMO_LEAD_ID    = process.env.DEMO_LEAD_ID    ?? 'replace-with-real-lead-uuid'
const DEMO_PROFILE_ID = process.env.DEMO_PROFILE_ID ?? 'replace-with-real-profile-uuid'

export default function BRIDemoPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: '1.5rem' }}>
        BRI Live Score — všetky varianty
      </h1>

      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)',
                    marginBottom: '1rem' }}>
          Ring variant — 3 veľkosti
        </p>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <BRILiveScore leadId={DEMO_LEAD_ID} profileId={DEMO_PROFILE_ID}
                        variant="ring" size="sm" />
          <BRILiveScore leadId={DEMO_LEAD_ID} profileId={DEMO_PROFILE_ID}
                        variant="ring" size="md" />
          <BRILiveScore leadId={DEMO_LEAD_ID} profileId={DEMO_PROFILE_ID}
                        variant="ring" size="lg" />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)',
                    marginBottom: '1rem' }}>
          Badge variant (pre tabuľky)
        </p>
        <BRILiveScore leadId={DEMO_LEAD_ID} profileId={DEMO_PROFILE_ID}
                      variant="badge" />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)',
                    marginBottom: '1rem' }}>
          Panel variant (full detail s grafom a faktormi)
        </p>
        <div style={{ maxWidth: 360 }}>
          <BRILiveScore leadId={DEMO_LEAD_ID} profileId={DEMO_PROFILE_ID}
                        variant="panel" />
        </div>
      </section>
    </main>
  )
}
