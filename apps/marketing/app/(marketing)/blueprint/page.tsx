import type { Metadata } from 'next'
import Link from 'next/link'
import { BLUEPRINT_CHECKOUT_URL } from './checkout'
import './blueprint.css'

export const metadata: Metadata = {
  title: 'Blueprint Kit — Founding Constitution pre majiteľov RK | Revolis',
  description:
    'Šesť veto otázok pred drahým rozhodnutím v realitnej kancelárii. Founding Constitution PDF z Blueprint Kitu. Platba a e-mail cez Lemon Squeezy — Revolis si adresu neukladá.',
  keywords: [
    'Blueprint Kit',
    'Founding Constitution',
    'realitná kancelária',
    'majiteľ RK',
    'Revolis',
  ],
  openGraph: {
    title: 'Blueprint Kit — brzda pred drahým rozhodnutím v RK',
    description:
      'PDF Founding Constitution: šesť veto otázok z reálnej kancelárie. Checkout cez Lemon Squeezy.',
    type: 'website',
    locale: 'sk_SK',
    siteName: 'Revolis',
  },
  twitter: {
    card: 'summary',
    title: 'Blueprint Kit — Founding Constitution',
    description: 'Šesť veto otázok pre majiteľov realitných kancelárií. PDF cez Lemon Squeezy.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/blueprint' },
}

const BENEFITS = [
  {
    title: 'Zastavíte drahý nápad, kým je ešte lacný',
    text: 'Šesť veto otázok pred novým CRM, AI nástrojom alebo „malým“ systémom, ktorý zožerie mesiac práce tímu.',
  },
  {
    title: 'Písané na jazve, nie na workshope',
    text: 'Každé pravidlo má konkrétnu chybu z produkcie — jeden platiaci klient, nie hypotetický buyer persona.',
  },
  {
    title: 'PDF hneď po zaplatení',
    text: 'Checkout a doručenie rieši Lemon Squeezy. E-mail ostáva u nich. Revolis si ho na tejto stránke neukladá.',
  },
] as const

export default function BlueprintPage() {
  return (
    <div className="bp-page">
      <header className="bp-header">
        <Link href="/" className="bp-logo">
          REVOLIS<span>.AI</span>
        </Link>
        <a className="bp-header-cta" href={BLUEPRINT_CHECKOUT_URL} rel="noopener noreferrer">
          Získať PDF
        </a>
      </header>

      <main className="bp-wrap">
        <section className="bp-hero">
          <p className="bp-kicker">Blueprint Kit · Founding Constitution</p>
          <h1 className="bp-title">Majiteľ kancelárie potrebuje brzdu. Nie ďalší systém.</h1>
          <p className="bp-lead">
            Pred nákupom CRM, AI alebo ďalšieho makléra: šesť otázok, ktoré zastavia drahú chybu.
            Founding Constitution je PDF z Blueprint Kitu — veto pravidlá z reálnej realitnej kancelárie.
          </p>
          <div className="bp-cta-row">
            <a className="bp-cta" href={BLUEPRINT_CHECKOUT_URL} rel="noopener noreferrer">
              Získať Constitution PDF
            </a>
          </div>
          <p className="bp-note">Platba a e-mail cez Lemon Squeezy · na tejto stránke formulár nie je.</p>
        </section>

        <section className="bp-sec" aria-labelledby="bp-benefits">
          <h2 id="bp-benefits" className="bp-h2">
            Čo z toho máte
          </h2>
          <div className="bp-grid">
            {BENEFITS.map((item) => (
              <article key={item.title} className="bp-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bp-sec" aria-labelledby="bp-who">
          <h2 id="bp-who" className="bp-h2">
            Pre koho to je
          </h2>
          <ul className="bp-who">
            <li>
              <strong>Majitelia realitných kancelárií</strong>
              Ľudia, ktorí rozhodujú o nástrojoch, nábore a tom, kam ide čas tímu tento kvartál.
            </li>
            <li>
              <strong>Kancelárie, ktoré už raz zaplatili za „géniálny systém“</strong>
              A zistili, že klient chcel vidieť dopyty — nie továreň na funkcie.
            </li>
            <li className="bp-no">
              <strong>Toto nie je</strong>
              Follow-up šablóna pre maklérov ani demo CRM. Je to brzda pred drahým rozhodnutím.
            </li>
          </ul>
        </section>

        <section className="bp-band" aria-labelledby="bp-cta">
          <h2 id="bp-cta">Stiahnuť Founding Constitution</h2>
          <p>
            Lemon Squeezy vyberie platbu, spýta sa na e-mail a pošle PDF. Revolis na tejto stránke
            žiadny e-mail nezberá.
          </p>
          <a className="bp-cta" href={BLUEPRINT_CHECKOUT_URL} rel="noopener noreferrer">
            Prejsť na checkout
          </a>
          <p className="bp-note">Constitution v1 · overené na 1 produkčnom projekte (Revolis)</p>
        </section>

        <p className="bp-foot">
          <Link href="/">Späť na Revolis</Link>
          {' · '}
          <a href="https://app.revolis.ai/privacy-policy">Ochrana osobných údajov</a>
        </p>
      </main>
    </div>
  )
}
