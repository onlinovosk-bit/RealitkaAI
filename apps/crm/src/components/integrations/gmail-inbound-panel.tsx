import type { GmailConnectionStatus } from "@/lib/inbound/gmail-connect-store";

type Props = {
  status: GmailConnectionStatus | null;
  /** Výsledok posledného pokusu (query ?gmail=…), zobrazí sa ako krátka správa. */
  notice?: string | null;
  configured: boolean;
};

const NOTICES: Record<string, string> = {
  connected: "Gmail je pripojený. Revolis číta iba správy so štítkom „Revolis“.",
  disconnected: "Gmail je odpojený. Revolis už nečíta žiadne správy.",
  error: "Pripojenie sa nepodarilo. Skúste to znova, alebo nás kontaktujte.",
};

function fmt(iso: string | null): string {
  if (!iso) return "zatiaľ nie";
  try {
    return new Date(iso).toLocaleString("sk-SK", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function GmailInboundPanel({ status, notice, configured }: Props) {
  const active = status?.status === "active";
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" data-testid="gmail-inbound-panel">
      <h2 className="text-lg font-semibold text-gray-900">Dopyty z Gmailu do Revolisu</h2>
      <p className="mt-2 text-sm text-gray-600">
        Portálové dopyty, ktoré Vám chodia do Gmailu, môžete poslať do Revolisu bez automatického preposielania.
        Revolis číta iba správy, ktoré si sami označíte štítkom „Revolis“. Ostatné e-maily neotvára a neukladá.
      </p>

      {notice && NOTICES[notice] ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800" role="status">
          {NOTICES[notice]}
        </p>
      ) : null}

      {active ? (
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>
            <strong>Pripojené:</strong> {status.gmailUserEmail}
          </p>
          <p>
            <strong>Štítok:</strong> {status.labelName} · <strong>Naposledy načítané:</strong> {fmt(status.lastPulledAt)}
          </p>
          {status.lastError ? (
            <p className="text-amber-700">
              Posledná chyba: {status.lastError}
            </p>
          ) : null}
          <form method="post" action="/api/integrations/gmail-inbound/disconnect">
            <button type="submit" className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
              Odpojiť Gmail
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-gray-700">
          {status?.status === "error" ? (
            <p className="text-amber-700">Pripojenie prestalo fungovať ({status.lastError ?? "chyba"}). Pripojte Gmail znova.</p>
          ) : null}
          <div>
            <p className="font-medium text-gray-900">Čo Revolis číta</p>
            <ul className="ml-5 list-disc">
              <li>správy, ktoré máte označené štítkom „Revolis“,</li>
              <li>predmet, text a základné kontaktné údaje z dopytu, aby vznikol lead.</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-900">Čo Revolis nerobí</p>
            <ul className="ml-5 list-disc">
              <li>nečíta ostatné e-maily ani prílohy,</li>
              <li>neodosiela poštu z Vášho Gmailu,</li>
              <li>nemení ani nemaže správy.</li>
            </ul>
          </div>
          <p>
            Google technicky nevie povolenie obmedziť iba na jeden štítok. Revolis je nastavený čítať výlučne štítok
            „Revolis“. Súhlas môžete kedykoľvek zrušiť tu (Odpojiť Gmail) alebo v Google účte (Zabezpečenie → Aplikácie s prístupom).
          </p>
          {configured ? (
            <a
              href="/api/integrations/gmail-inbound/connect"
              className="inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Pripojiť Gmail (iba označený štítok)
            </a>
          ) : (
            <p className="text-amber-700">Pripojenie ešte nie je pripravené na našej strane. Napíšte nám a zapneme ho.</p>
          )}
        </div>
      )}
    </section>
  );
}
