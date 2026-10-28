import PricingSection from './PricingSection'
import { ProductMock, LossCalculator, GoalsPicker, StickyCta } from './LandingInteractive'
import { CALENDLY_DEMO_URL } from '../../lib/calendly'

const FAQ = [
  {
    q: 'Nemáme čas na zavádzanie nového systému.',
    a: 'Začíname s minimálnou konfiguráciou — prvé výsledky uvidíte po zapnutí denného plánu a pripravených odpovedí. Tím nemusí meniť celý proces naraz.',
  },
  {
    q: 'Funguje to s portálmi, ktoré používame?',
    a: 'Dopyty z hlavných slovenských portálov a e-mailu sa zbiehajú do jedného prehľadu. Na deme Vám ukážeme presne tie, ktoré používa Vaša kancelária.',
  },
  {
    q: 'Čo ak systém pošle klientovi nezmysel?',
    a: 'Nepošle nič bez Vás. Každá správa čaká na Vaše schválenie — rozhodujete Vy, systém pripravuje. Plná kontrola ostáva u makléra.',
  },
  {
    q: 'Nie som technický typ, zvládnem to?',
    a: 'Nepotrebujete žiadne technické znalosti. Všetko nastavíme spolu a vysvetlíme na príkladoch z Vášho bežného dňa — obhliadky, inzeráty, klienti.',
  },
  {
    q: 'Je to pre jednotlivca alebo celú kanceláriu?',
    a: 'Pre oboje. Maklérom pomáha stabilizovať príjem, majiteľom zjednotiť prácu tímu — kancelária pôsobí navonok jednotne a profesionálne.',
  },
  {
    q: 'Čo s našimi dátami a GDPR?',
    a: 'Dáta sú uložené v EÚ a nikdy ich nezdieľame na marketingové účely. Spracúvajú ich výhradne naši zmluvní subdodávatelia viazaní GDPR. Kedykoľvek si ich viete vyžiadať alebo nechať vymazať.',
  },
  {
    q: 'Koľko to stojí a čo ak to nebude fungovať?',
    a: 'Presný balík podľa veľkosti kancelárie preberieme na deme — bez skrytých položiek. A prvých 30 dní platí záruka vrátenia peňazí bez otázok.',
  },
]

export default function LandingPage() {
  return (
    <>
      <header>
        <div className="wrap nav">
          <a className="logo" href="#">
            REVOLIS<b>›_</b>
          </a>
          <a className="btn" href={CALENDLY_DEMO_URL} target="_blank" rel="noopener noreferrer">
            Rezervovať demo
          </a>
        </div>
      </header>

      <div className="hero">
        <div className="wrap">
          <p className="eyebrow">Pre realitných maklérov a majiteľov RK na Slovensku</p>
          <h1>
            Inzerát hotový za minúty. <em>Dopyty v CRM bez prepisovania.</em>
          </h1>
          <p className="lead">
            Revolis uloží dopyty z portálových e-mailov a pripraví text inzerátu z parametrov
            nehnuteľnosti — Vy máte čas na obhliadky a nábery, nie na administratívu.
          </p>
          <div className="hero-cta">
            <a className="btn btn-lg" href={CALENDLY_DEMO_URL} target="_blank" rel="noopener noreferrer">
              Rezervovať demo zdarma
            </a>
            <a className="btn btn-lg btn-ghost" href="#kalkulacka">
              Koľko ma stojí pomalá odpoveď? ↓
            </a>
          </div>
          <p className="micro">15–20 minút · žiadne záväzky · bez kreditnej karty</p>
        </div>
      </div>

      <section id="produkt">
        <div className="wrap">
          <p className="eyebrow">Toto je Revolis</p>
          <h2>Vaša kancelária na jednej obrazovke.</h2>
          <p className="sub">Žiadne sľuby naslepo — takto vyzerá pracovné ráno v Revolise.</p>
          <ProductMock />
        </div>
      </section>

      <section id="pains">
        <div className="wrap">
          <p className="eyebrow">Poznáte to?</p>
          <h2>Strácate čas, ktorý patrí na obhliadky a nábery.</h2>
          <p className="sub">
            Nové dopyty pribúdajú, inzeráty treba písať — a hodiny padnú na administratívu namiesto predaja.
          </p>
          <div className="pains">
            <div className="pain">
              <span className="pk">01 / RÝCHLOSŤ</span>
              <h3>Inzerát píšete namiesto náberu</h3>
              <p>Kým skladáte text z parametrov, predávajúci môže ísť ku kolegovi, ktorý ponuku zverejnil skôr.</p>
            </div>
            <div className="pain">
              <span className="pk">02 / PREPISOVANIE</span>
              <h3>Dopyty prepisujete z e-mailov</h3>
              <p>Meno, telefón, odkaz na inzerát — z každého portálového e-mailu ručne do tabuľky.</p>
            </div>
            <div className="pain">
              <span className="pk">03 / ČAS</span>
              <h3>Hodiny denne pri administratíve</h3>
              <p>Triedenie dopytov a písanie inzerátov žerie čas, ktorý chýba na obhliadke.</p>
            </div>
            <div className="pain">
              <span className="pk">04 / CHAOS</span>
              <h3>Dopyty roztrúsené po portáloch</h3>
              <p>Nehnuteľnosti.sk, Topreality, Reality.sk, Bazoš, e-mail — každý kanál zvlášť, niečo sa vždy stratí.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="kalkulacka">
        <div className="wrap">
          <p className="eyebrow">Spočítajte si to</p>
          <h2>Koľko Vás mesačne stojí pomalá odpoveď?</h2>
          <p className="sub">Posuňte hodnoty podľa svojej kancelárie. Čísla sa prepočítajú okamžite.</p>
          <LossCalculator />
        </div>
      </section>

      <section id="ako">
        <div className="wrap">
          <p className="eyebrow">Ako to funguje</p>
          <h2>Od záujemcu k obchodu. Tri kroky.</h2>
          <div className="steps3">
            <div className="step">
              <span className="n">01</span>
              <h3>Dopyty na jednom mieste</h3>
              <p>
                <b>Nehnuteľnosti.sk, Topreality, Reality.sk, Bazoš</b> aj e-mail — všetko sa zbieha do jedného prehľadu. Nič sa nestratí.
              </p>
            </div>
            <div className="step">
              <span className="n">02</span>
              <h3>Systém zoradí a pripraví</h3>
              <p>
                Každý záujemca dostane <b>skóre pripravenosti kúpy</b>. Odpovede a následné správy sú pripravené — Vy ich len schválite.
              </p>
            </div>
            <div className="step">
              <span className="n">03</span>
              <h3>Vy uzatvárate obchody</h3>
              <p>
                Deň začínate zoznamom priorít, nie triedením e-mailov. <b>Viac uzavretí, menej stresu.</b>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="case">
        <div className="wrap">
          <p className="eyebrow">Prvý klient</p>
          <h2>Realitná kancelária z Prešova.</h2>
          <div className="case">
            <div>
              <blockquote>„Prvý mesiac sme ušetrili zhruba 10 hodín týždenne na inzercii a príprave podkladov."</blockquote>
              <p className="who">majiteľ realitnej kancelárie, Prešov — náš prvý klient</p>
            </div>
            <div className="case-num">
              <b>10 h</b>
              <span>týždenne späť v kalendári celého tímu</span>
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section id="goals">
        <div className="wrap">
          <p className="eyebrow">Personalizácia</p>
          <h2>Čo chcete dosiahnuť?</h2>
          <p className="sub">Vyberte jeden alebo viac cieľov — demo Vám pripravíme presne na ne.</p>
          <GoalsPicker />
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <p className="eyebrow">Najčastejšie námietky</p>
          <h2>Na čo sa makléri pýtajú.</h2>
          <div className="faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <div className="a">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="final">
        <div className="wrap">
          <div className="final">
            <p className="eyebrow" style={{ justifyContent: 'center' }}>
              Ďalší krok
            </p>
            <h2>15–20 minút, ktoré Vám môžu vrátiť hodiny každý týždeň.</h2>
            <p className="sub">
              Demo vedie zakladateľ — uvidíte systém na príkladoch z Vašej praxe a odídete s konkrétnymi krokmi. S nami alebo aj bez nás.
            </p>
            <div className="cta-row-split">
              <a className="btn btn-lg" href={CALENDLY_DEMO_URL} target="_blank" rel="noopener noreferrer">
                Rezervovať demo zdarma
              </a>
              <a className="btn btn-lg btn-ghost" href="#cennik">
                Pozrieť cenník
              </a>
            </div>
            <p className="micro">Žiadna zmluva. Žiadny predajný tlak.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span>© 2026 Revolis — ONLINOVO s.r.o.</span>
          <span>
            <a href="/blog">Blog</a> ·{' '}
            <a href="https://app.revolis.ai/privacy-policy">Ochrana osobných údajov</a> ·{' '}
            <a href="https://app.revolis.ai/terms">VOP</a> · <a href="mailto:info@revolis.ai">info@revolis.ai</a>
          </span>
        </div>
      </footer>

      <StickyCta />
    </>
  )
}
