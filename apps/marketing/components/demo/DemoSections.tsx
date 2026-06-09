import DemoCTA from './DemoCTA'

export function HeroSection() {
  return (
    <section className="demo-sec" id="hero">
      <p className="demo-tag">Revolis.AI · Demo landing</p>
      <h1 className="demo-title">
        Toto je tvoj nový systém.<br />
        <em>Kto kúpi tento mesiac — na jeden pohľad.</em>
      </h1>
      <p className="demo-desc">
        Jeden pohľad stačí: kto je pripravený kúpiť, ktoré nehnuteľnosti sú vhodné a čo má tím urobiť dnes.
        AI odporúča. Maklér rozhoduje.
      </p>
      <ul className="demo-list">
        <li>AI skóre pripravenosti (BRI) pre každého klienta</li>
        <li>Automatické párovanie klientov s nehnuteľnosťami</li>
        <li>Denné priority pre každého makléra v tíme</li>
        <li>Notifikácie keď je klient pripravený na akciu</li>
      </ul>
      <DemoCTA variant="hero" />
      <div className="demo-mock">
        <div className="demo-row" style={{ marginBottom: 12 }}>
          <span className="demo-badge">Revolis.AI · Prehľad</span>
          <span style={{ color: 'var(--demo-muted)' }}>Horúci záujem</span>
        </div>
        <div className="demo-inner">
          <p className="demo-kpi">Index pripravenosti kúpy dnes</p>
          <div className="demo-bar-wrap">
            <div className="demo-bar-col m1" />
            <div className="demo-bar-col m2" />
            <div className="demo-bar-col hi" />
            <div className="demo-bar-col m3" />
          </div>
        </div>
      </div>
    </section>
  )
}

const PAINS = [
  {
    icon: '😴',
    title: 'Dopyt prišiel o 22:47. Odpovedali ste ráno. Bolo neskoro.',
    text: 'Prvý kto odpovie dostane príležitosť. Priemerný čas odpovede makléra: 7 hodín. Revolis.AI: pod 2 minúty.',
  },
  {
    icon: '👻',
    title: 'Písali ste mu pred 3 mesiacmi. Kúpil od niekoho iného.',
    text: 'Mal záujem. Bol „ešte nie pripravený." Vypadol z radaru. Revolis ho sleduje mesiace automaticky.',
  },
  {
    icon: '💸',
    title: '68 % príležitostí nebolo nikdy druhýkrát kontaktovaných.',
    text: 'CRM zaznamenáva. Revolis.AI aktívne pracuje s databázou každý deň — bez vášho vstupu.',
  },
  {
    icon: '🚪',
    title: 'Maklér odišiel. Jeho príležitosti odišli s ním.',
    text: 'Revolis drží vzťahy na úrovni kancelárie — nie v telefóne jednotlivca.',
  },
]

export function PainSection() {
  return (
    <section className="demo-sec" id="problem">
      <p className="demo-tag">Problém</p>
      <h2 className="demo-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
        Bolí vás toto?
      </h2>
      <p className="demo-desc">Každý maklér pozná tieto momenty. Každý z nich je stratená provízia.</p>
      <div className="demo-pain-grid">
        {PAINS.map((pain) => (
          <article key={pain.title} className="demo-pain-card">
            <div className="demo-pain-icon">{pain.icon}</div>
            <h3 className="demo-pain-title">{pain.title}</h3>
            <p className="demo-pain-text">{pain.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const SOLUTIONS = [
  {
    title: 'AI Lead Scoring',
    text: 'BRI skóre 1–100 pre každú príležitosť. Voláte len tým s 80+. Menej zbytočných hovorov o 67 %.',
  },
  {
    title: 'Rýchlejšie odpovede',
    text: 'AI navrhne odpovede a follow-up v tóne kancelárie. Maklér schváli jedným klikom.',
  },
  {
    title: 'Denný briefing',
    text: 'Každé ráno 5 priorít dňa. Kto má skóre 91 — prvý hovor. Bez otvárania ďalších systémov.',
  },
  {
    title: 'Reaktivácia databázy',
    text: 'Spiace príležitosti sa prebúdzajú automaticky. Nové obchody z kontaktov, za ktoré ste už zaplatili.',
  },
]

export function SolutionSection() {
  return (
    <section className="demo-sec" id="solution">
      <p className="demo-tag">Riešenie</p>
      <h2 className="demo-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
        Čo Revolis.AI robí za vás
      </h2>
      <p className="demo-desc">
        Nie ďalší CRM, ktorý musíte aktualizovať. Systém, ktorý pracuje namiesto vás — každú hodinu.
      </p>
      <div className="demo-solution-grid">
        {SOLUTIONS.map((item) => (
          <article key={item.title} className="demo-solution-item">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="demo-card" style={{ marginTop: 40 }}>
        <h3 className="demo-title" style={{ fontSize: '1.35rem' }}>Čísla, ktoré rozhodujú o nákupe</h3>
        <div className="demo-grid3">
          <div className="demo-inner">
            <p className="demo-kpi">Odozva (95. percentil)</p>
            <p className="demo-stat">&lt; 2 min</p>
            <p className="demo-kpi">AI prvá odpoveď</p>
          </div>
          <div className="demo-inner">
            <p className="demo-kpi">Pokrytie follow-upov</p>
            <p className="demo-stat">92%</p>
          </div>
          <div className="demo-inner">
            <p className="demo-kpi">Nárast úspešnosti</p>
            <p className="demo-stat">+34%</p>
          </div>
        </div>
      </div>

      <div className="demo-card" style={{ marginTop: 20 }}>
        <h3 className="demo-title" style={{ fontSize: '1.25rem' }}>Kto odpovedá prvý, berie províziu</h3>
        <div className="demo-inner">
          <div className="demo-row">
            <span>Priemerná kancelária</span>
            <strong>4h 12m</strong>
          </div>
        </div>
        <div className="demo-inner" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <div className="demo-row">
            <span style={{ fontWeight: 700 }}>Revolis.AI</span>
            <strong className="demo-money">&lt; 2 min</strong>
          </div>
        </div>
      </div>
    </section>
  )
}

export function DemoCTASection() {
  return (
    <section className="demo-sec" id="cta">
      <DemoCTA variant="band" />
    </section>
  )
}

const FAQ_ITEMS = [
  {
    q: 'Oplatí sa to finančne?',
    a: 'Solo Seat od 79 €/mes vs. priemerná provízia 2 000–4 000 €. Jeden reaktivovaný záujemca často pokryje ročné predplatné.',
  },
  {
    q: 'Môžem to vyskúšať bez záväzku?',
    a: '30-dňová garancia vrátenia peňazí. Zrušenie kedykoľvek. Nastavenie trvá približne 4 minúty.',
  },
  {
    q: 'Máme už CRM. Prečo potrebujeme ešte jedno?',
    a: 'Revolis.AI nie je CRM. Integruje sa s vaším CRM a robí to, čo sa má stať — scoring, briefing a follow-up sekvencie.',
  },
  {
    q: 'Sú naše dáta v bezpečí?',
    a: 'EU servery, GDPR compliant, AES-256 šifrovanie. Vaše dáta nie sú zdieľané ani použité na tréning modelov.',
  },
]

export function FaqSection() {
  return (
    <section className="demo-sec" id="faq">
      <p className="demo-tag">FAQ</p>
      <h2 className="demo-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
        Často kladené otázky
      </h2>
      <div className="demo-faq-list" style={{ margin: '28px auto 0' }}>
        {FAQ_ITEMS.map((item) => (
          <article key={item.q} className="demo-faq">
            <p className="demo-faq-q">{item.q}</p>
            <p className="demo-faq-a">{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
