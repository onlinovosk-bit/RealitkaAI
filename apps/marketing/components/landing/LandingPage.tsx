import PricingSection from './PricingSection'
import { ProductMock, LossCalculator, GoalsPicker, StickyCta } from './LandingInteractive'
import { CALENDLY_DEMO_URL } from '../../lib/calendly'

const FAQ = [
  {
    q: 'Nemáme čas na zavádzanie nového systému.',
    a: 'Začíname s minimálnou konfiguráciou — prvé výsledky vidíš po zapnutí denného plánu a pripravených odpovedí. Tím nemusí meniť celý proces naraz.',
  },
  {
    q: 'Funguje to s portálmi, ktoré používame?',
    a: 'Dopyty z hlavných slovenských portálov a e-mailu sa zbiehajú do jedného prehľadu. Na deme ti ukážeme presne tie, ktoré používa tvoja kancelária.',
  },
  {
    q: 'Čo ak systém pošle klientovi nezmysel?',
    a: 'Nepošle nič bez teba. Každá správa čaká na tvoje schválenie — ty rozhoduješ, systém pripravuje. Plná kontrola ostáva u makléra.',
  },
  {
    q: 'Nie som technický typ, zvládnem to?',
    a: 'Nepotrebuješ žiadne technické znalosti. Všetko nastavíme spolu a vysvetlíme na príkladoch z tvojho bežného dňa — obhliadky, inzeráty, klienti.',
  },
  {
    q: 'Je to pre jednotlivca alebo celú kanceláriu?',
    a: 'Pre oboje. Maklérom pomáha stabilizovať príjem, majiteľom zjednotiť prácu tímu — kancelária pôsobí navonok jednotne a profesionálne.',
  },
  {
    q: 'Čo s našimi dátami a GDPR?',
    a: 'Dáta sú uložené v EÚ a nikdy ich nezdieľame na marketingové účely. Spracúvajú ich výhradne naši zmluvní subdodávatelia viazaní GDPR. Kedykoľvek si ich vieš vyžiadať alebo nechať vymazať.',
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
            Získaj viac klientov. Uzatváraj viac obchodov. <em>Bez chaosu.</em>
          </h1>
          <p className="lead">
            Revolis každé ráno vyberie najdôležitejšie príležitosti, zoradí záujemcov podľa pripravenosti kúpiť a povie tvojmu tímu,{' '}
            <strong>komu volať ako prvému</strong> — ešte pred prvou kávou.
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
          <p className="micro" style={{ marginTop: 6 }}>
            // prvý klient: ~10 h týždenne späť už v prvom mesiaci
          </p>
        </div>
      </div>

      <section id="produkt">
        <div className="wrap">
          <p className="eyebrow">Toto je Revolis</p>
          <h2>Tvoja kancelária na jednej obrazovke.</h2>
          <p className="sub">Žiadne sľuby naslepo — takto vyzerá pracovné ráno v Revolise.</p>
          <ProductMock />
        </div>
      </section>

      <section id="pains">
        <div className="wrap">
          <p className="eyebrow">Poznáš to?</p>
          <h2>Strácaš klientov, lebo nemáš prehľad.</h2>
          <p className="sub">
            Nové dopyty pribúdajú, času je menej — a najdôležitejší klient ostane zakopaný v tabuľke, kým neodíde ku konkurencii.
          </p>
          <div className="pains">
            <div className="pain">
              <span className="pk">01 / RÝCHLOSŤ</span>
              <h3>Konkurencia odpovedá skôr</h3>
              <p>Klient ide k tomu, kto zareaguje prvý a pôsobí profesionálne. Nie k tomu, kto je objektívne lepší.</p>
            </div>
            <div className="pain">
              <span className="pk">02 / PRIORITY</span>
              <h3>Nevieš, komu volať ako prvému</h3>
              <p>Máš kontakty, ale nevieš, kto je pripravený kúpiť — a s kým len strácaš hodiny.</p>
            </div>
            <div className="pain">
              <span className="pk">03 / ČAS</span>
              <h3>Hodiny denne pri inzerátoch</h3>
              <p>Príprava jedného inzerátu zoberie 20–30 minút. A aj tak volajú skôr zvedavci než kupci.</p>
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
          <p className="eyebrow">Spočítaj si to sám</p>
          <h2>Koľko ťa mesačne stojí pomalá odpoveď?</h2>
          <p className="sub">Posuň hodnoty podľa svojej kancelárie. Čísla sa prepočítajú okamžite.</p>
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
                Každý záujemca dostane <b>skóre pripravenosti kúpy</b>. Odpovede a následné správy sú pripravené — ty ich len schváliš.
              </p>
            </div>
            <div className="step">
              <span className="n">03</span>
              <h3>Ty uzatváraš obchody</h3>
              <p>
                Deň začínaš zoznamom priorít, nie triedením e-mailov. <b>Viac uzavretí, menej stresu.</b>
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
          <h2>Čo chceš dosiahnuť?</h2>
          <p className="sub">Vyber jeden alebo viac cieľov — demo ti pripravíme presne na ne.</p>
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
            <h2>15–20 minút, ktoré ti môžu vrátiť hodiny každý týždeň.</h2>
            <p className="sub">
              Demo vedie zakladateľ — uvidíš systém na príkladoch z tvojej praxe a odídeš s konkrétnymi krokmi. S nami alebo aj bez nás.
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
            <a href="https://app.revolis.ai/privacy-policy">Ochrana osobných údajov</a> ·{' '}
            <a href="https://app.revolis.ai/terms">VOP</a> · <a href="mailto:info@revolis.ai">info@revolis.ai</a>
          </span>
        </div>
      </footer>

      <StickyCta />
    </>
  )
}
