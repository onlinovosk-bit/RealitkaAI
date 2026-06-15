'use client'

import { useEffect, useState } from 'react'
import { CALENDLY_DEMO_URL, calendlyHref } from '../../lib/calendly'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const NBA_TEXTS: Record<string, string> = {
  peter:
    'Zavolaj <b>Petrovi V.</b> — pýtal sa na financovanie aj obhliadku. Najvyššia šanca na obchod tento týždeň.',
  jana: 'Napíš <b>Jane K.</b> — 2-izb v Petržalke, skóre 74. Navrhni termín obhliadky tento týždeň.',
  horvath: 'Follow-up <b>M. Horváth</b> — dom Senec, záujem o financovanie. Zavolaj po 15:00.',
  toth: '<b>L. Tóthová</b> — pozemok Pezinok. Over budget a priprav krátky brief pred volaním.',
}

const TYPER_TEXTS = [
  '3-izbový byt, Ružinov — 78 m², svetlý, po kompletnej rekonštrukcii. Loggia s výhľadom do zelene, pivnica, výborná občianska vybavenosť…',
  'Rodinný dom, Senec — 5 izieb, pozemok 612 m², tichá ulica 10 minút od jazier. Ideálne pre rodinu, ktorá chce pokoj a rýchly dojazd…',
]

const GOALS = [
  { key: 'Viac horúcich záujemcov', title: 'Chcem viac horúcich záujemcov', text: 'Zorad mi klientov podľa toho, kto je pripravený kúpiť.' },
  { key: 'Poriadok v klientoch', title: 'Chcem poriadok v klientoch', text: 'Jeden pohľad na všetkých klientov a ich stav.' },
  { key: 'Rýchlejšie odpovede', title: 'Chcem odpovedať do minút', text: 'Pripravené odpovede na nové dopyty — bez nočných smien.' },
  { key: 'Prehľad pre majiteľa', title: 'Chcem prehľad o tíme', text: 'Ranný report: leady, obchody, výkon — bez vypytovania.' },
]

function fmt(n: number) {
  return `${n.toLocaleString('sk-SK')} €`
}

export function ProductMock() {
  const [selected, setSelected] = useState('peter')
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(TYPER_TEXTS[0])
      return
    }
    let t = 0
    let i = 0
    let cancelled = false
    function type() {
      if (cancelled) return
      const s = TYPER_TEXTS[t]
      if (i <= s.length) {
        setTyped(s.slice(0, i++))
        setTimeout(type, 28 + Math.random() * 34)
      } else {
        setTimeout(() => {
          i = 0
          t = (t + 1) % TYPER_TEXTS.length
          type()
        }, 3200)
      }
    }
    type()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mock-frame" aria-label="Ukážka rozhrania Revolis s ilustračnými dátami">
      <div className="mock-top">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="mock-title">app.revolis.ai — Prehľad</span>
        <span className="mock-badge">Vzorové dáta</span>
      </div>
      <div className="mock-body">
        <div className="mock-col">
          <p className="mock-h">Dnešní záujemcovia · zoradení podľa skóre</p>
          {[
            { id: 'peter', nm: 'Peter V.', src: '3-izb · Ružinov', score: '92 · HOT', cls: 'hot' },
            { id: 'jana', nm: 'Jana K.', src: '2-izb · Petržalka', score: '74', cls: 'ok' },
            { id: 'horvath', nm: 'M. Horváth', src: 'dom · Senec', score: '58', cls: 'cold' },
            { id: 'toth', nm: 'L. Tóthová', src: 'pozemok · Pezinok', score: '41', cls: 'cold' },
          ].map((row) => (
            <button
              key={row.id}
              type="button"
              className={`lead-row${selected === row.id ? ' sel' : ''}`}
              aria-label={`Priorita: ${row.nm}`}
              onClick={() => setSelected(row.id)}
            >
              <span className="nm">{row.nm}</span>
              <span className="src">{row.src}</span>
              <span className={`score ${row.cls}`}>{row.score}</span>
            </button>
          ))}
        </div>
        <div className="mock-col">
          <div className="nba">
            <span className="tag">Denná priorita</span>
            <p dangerouslySetInnerHTML={{ __html: NBA_TEXTS[selected] ?? NBA_TEXTS.peter }} />
          </div>
          <div className="ai-box">
            <span className="lbl">Návrh inzerátu — pripravený na tvoje schválenie</span>
            {typed}
          </div>
        </div>
      </div>
      <div className="mock-foot">
        <span>
          <span className="ok-dot">●</span> Ranný report odoslaný majiteľovi · 06:00
        </span>
        <span>4 následné správy čakajú na schválenie</span>
      </div>
    </div>
  )
}

export function LossCalculator() {
  const [dop, setDop] = useState(60)
  const [cas, setCas] = useState(120)
  const [kon, setKon] = useState(8)
  const [pro, setPro] = useState(3000)

  const lostShare = Math.min(Math.max((cas - 10) / 240, 0), 1) * 0.5
  const lostDeals = dop * (kon / 100) * lostShare
  const loss = Math.round((lostDeals * pro) / 50) * 50
  const gain = Math.round((loss * 0.8) / 50) * 50
  const fast = loss < 100

  return (
    <div className="calc">
      <div className="calc-in">
        <h3>Tvoja kancelária dnes</h3>
        <div className="ctl">
          <label htmlFor="rDop">
            Nové dopyty mesačne <output>{dop}</output>
          </label>
          <input id="rDop" type="range" min={10} max={300} step={5} value={dop} onChange={(e) => setDop(+e.target.value)} />
        </div>
        <div className="ctl">
          <label htmlFor="rCas">
            Priemerný čas do odpovede <output>{cas} min</output>
          </label>
          <input id="rCas" type="range" min={5} max={480} step={5} value={cas} onChange={(e) => setCas(+e.target.value)} />
        </div>
        <div className="ctl">
          <label htmlFor="rKon">
            Konverzia dopytov na obchod <output>{kon} %</output>
          </label>
          <input id="rKon" type="range" min={2} max={20} step={1} value={kon} onChange={(e) => setKon(+e.target.value)} />
        </div>
        <div className="ctl">
          <label htmlFor="rPro">
            Priemerná provízia <output>{fmt(pro)}</output>
          </label>
          <input id="rPro" type="range" min={1000} max={8000} step={250} value={pro} onChange={(e) => setPro(+e.target.value)} />
        </div>
      </div>
      <div className="calc-out" aria-live="polite">
        {fast ? (
          <div>
            <p>
              <strong>Reaguješ rýchlo 👍</strong> Revolis ti ušetrí čas pri inzerátoch a follow-upoch.
            </p>
            <a
              className="btn"
              href={calendlyHref('calc_fast')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.gtag?.('event', 'landing_cta_click', { position: 'calc_fast' })}
            >
              Rezervovať demo →
            </a>
          </div>
        ) : (
          <div>
            <div className="big">
              <b>−{fmt(loss)}</b>
              <span>odhad ušlých provízií mesačne kvôli pomalej reakcii</span>
            </div>
            <div className="mid">
              <b>ročne ≈ {fmt(loss * 12)}</b>
              <span>odhad ušlých provízií</span>
            </div>
            <div className="mid">
              <b>≈ {lostDeals.toFixed(1)} obchodov mesačne</b>
              <span>stratené kvôli pomalej reakcii</span>
            </div>
            <div className="mid">
              <b>+{fmt(gain)}</b>
              <span>potenciál pri odpovedi do pár minút</span>
            </div>
            <a
              className="btn"
              href={calendlyHref(`calc_loss_${loss}`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.gtag?.('event', 'landing_cta_click', { position: 'calc_loss' })}
            >
              Chcem tie peniaze späť → demo
            </a>
          </div>
        )}
      </div>
      <div className="calc-note">
        Ilustračný model: vychádza z predpokladu, že so stúpajúcim časom odpovede klesá šanca, že sa záujemca ešte ozve. Nie je to garancia výsledku — presný dopad ti ukážeme na tvojich dátach na deme.
      </div>
    </div>
  )
}

export function GoalsPicker() {
  const [picked, setPicked] = useState<string[]>([])

  function toggle(key: string) {
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const goalHref =
    picked.length > 0
      ? calendlyHref(`goals_${picked.map((g) => g.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('_')}`)
      : CALENDLY_DEMO_URL

  return (
    <>
      <div className="goals">
        {GOALS.map((g) => {
          const on = picked.includes(g.key)
          return (
            <button
              key={g.key}
              type="button"
              className="goal"
              aria-pressed={on}
              onClick={() => toggle(g.key)}
            >
              <span className="chk" aria-hidden="true">
                {on ? '[✓]' : '[ ]'}
              </span>
              <h3>{g.title}</h3>
              <p>{g.text}</p>
            </button>
          )
        })}
      </div>
      {picked.length > 0 && (
        <>
          <div className="goal-result show">
            Vybrané: <b>{picked.join(' · ')}</b>. Spomeň to pri rezervácii — demo postavíme presne na tieto ciele.
          </div>
          <a
            className="btn"
            href={goalHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 14 }}
            onClick={() => window.gtag?.('event', 'landing_cta_click', { position: 'goals' })}
          >
            Rezervovať demo na tieto ciele
          </a>
        </>
      )}
    </>
  )
}

export function StickyCta() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hero = document.querySelector('.landing-v2 .hero')
    if (!hero || !('IntersectionObserver' in window)) {
      setShow(true)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShow(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => setShow(!en.isIntersecting))
      },
      { threshold: 0 },
    )
    obs.observe(hero)
    return () => obs.disconnect()
  }, [])

  return (
    <div className={`sticky-cta${show ? ' show' : ''}`}>
      <a
        className="btn"
        href={calendlyHref('sticky')}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => window.gtag?.('event', 'landing_cta_click', { position: 'sticky' })}
      >
        Rezervovať demo zdarma →
      </a>
    </div>
  )
}
