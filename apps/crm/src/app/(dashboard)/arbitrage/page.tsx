import { ArbitrageDashboard } from '@/components/arbitrage/ArbitrageDashboard'
import { getCurrentProfile } from '@/lib/auth'

export const metadata = { title: 'Arbitrážne zhody – Revolis.AI' }

export default async function ArbitragePage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Profil nenájdený.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white mb-1">Arbitrážne zhody</h1>
        <p className="text-sm text-slate-500">
          Cross-portálové cenové rozdiely medzi inzertnými portálmi a Bazošom — napájané na live scan engine.
        </p>
      </div>
      <ArbitrageDashboard profileId={profile.id} />
    </div>
  )
}
