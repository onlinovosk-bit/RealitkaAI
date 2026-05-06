'use client'
import { useEffect, useRef, useState } from 'react'
import LeadCaptureModal from '../../components/LeadCaptureModal'

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export default function DemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [exitVisible, setExitVisible] = useState(false)
  const [leadModal, setLeadModal] = useState<string | null>(null)
  const openModal = (source: string) => setLeadModal(source)

  useEffect(() => {
    // ── PARTICLES ──
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = 0, H = 0
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number }
    const particles: Particle[] = []

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) particles.push({
      x: Math.random() * 2000, y: Math.random() * 1200,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .5, a: Math.random()
    })

    let rafId = 0
    function drawParticles() {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${p.a * .4})`; ctx.fill()
      })
      rafId = requestAnimationFrame(drawParticles)
    }
    drawParticles()

    // ── WAVEFORM ──
    const wf = document.getElementById('waveformBars')
    const wColors = ['#22C55E','#22C55E','#60A5FA','#60A5FA','#F97316','#F97316','#EF4444','#EF4444','#60A5FA','#60A5FA','#22C55E','#22C55E','#60A5FA','#F97316','#EF4444','#60A5FA']
    if (wf) {
      for (let i = 0; i < 80; i++) {
        const bar = document.createElement('div')
        bar.className = 'waveform-bar'
        const h = 10 + Math.random() * 45
        bar.style.background = wColors[i % wColors.length]
        bar.style.opacity = '.7'
        bar.style.setProperty('--dur', (0.4 + Math.random() * 0.8) + 's')
        bar.style.setProperty('--delay', (Math.random() * 0.5) + 's')
        bar.style.setProperty('--h', h + 'px')
        bar.style.height = '8px'
        wf.appendChild(bar)
      }
    }

    // ── COUNTERS ──
    function animCount(el: HTMLElement | null, target: number, suffix = '', duration = 2000) {
      if (!el) return
      let startTime: number | null = null
      function step(ts: number) {
        if (!startTime) startTime = ts
        const p = Math.min((ts - startTime) / duration, 1)
        el.textContent = Math.floor(p * target).toLocaleString() + suffix
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    const timer1 = setTimeout(() => {
      animCount(document.getElementById('t1'), 1247)
      animCount(document.getElementById('t2'), 342)
      animCount(document.getElementById('t3'), 34, '%')
      animCount(document.getElementById('t4'), 892, 'h')
    }, 600)

    const timer2 = setTimeout(() => {
      animCount(document.getElementById('stat1'), 3)
      animCount(document.getElementById('stat2'), 34, 'd')
      animCount(document.getElementById('stat3'), 3480)
      animCount(document.getElementById('stat4'), 12)
    }, 1200)

    // ── LIVE TICKER ──
    const tickInterval = setInterval(() => {
      const el = document.getElementById('t1')
      if (!el) return
      const cur = parseInt(el.textContent?.replace(/\D/g, '') || '1247') || 1247
      el.textContent = (cur + Math.floor(Math.random() * 3) + 1).toLocaleString()
    }, 2000)

    // ── CHART ANIMATION ──
    function animateChart() {
      const clip = document.getElementById('clipRect')
      if (!clip) return
      window.gtag?.('event', 'demo_section_engaged', { section: 'activity_chart' })
      let w = 0
      const interval = setInterval(() => {
        w = Math.min(w + 16, 800)
        clip.setAttribute('width', String(w))
        if (w >= 800) clearInterval(interval)
      }, 16)
      setTimeout(() => {
        animCount(document.getElementById('chartStat1'), 1247)
        animCount(document.getElementById('chartStat2'), 342)
        animCount(document.getElementById('chartStat3'), 189)
      }, 400)
    }

    const chartObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { animateChart(); chartObs.disconnect() } })
    }, { threshold: .3 })
    const chartEl = document.getElementById('activityChart')
    if (chartEl) chartObs.observe(chartEl.closest('section') || chartEl)

    // ── RADAR ──
    const poly = document.getElementById('radarPoly')
    const radarPoints = [
      [150, 50], [237, 100], [237, 200],
      [150, 250], [63, 200], [63, 100]
    ]
    const scales = [.91, .78, .85, .67, .72, .88]
    let radarDone = false
    function animateRadar() {
      if (radarDone || !poly) return
      radarDone = true
      window.gtag?.('event', 'demo_section_engaged', { section: 'radar_chart' })
      let prog = 0
      const interval = setInterval(() => {
        prog = Math.min(prog + 0.03, 1)
        const pts = radarPoints.map((p, i) => {
          const cx = 150, cy = 150
          const dx = p[0] - cx, dy = p[1] - cy
          return `${cx + dx * scales[i] * prog},${cy + dy * scales[i] * prog}`
        })
        poly.setAttribute('points', pts.join(' '))
        if (prog >= 1) clearInterval(interval)
      }, 16)
    }

    // ── BARS ──
    function animateBars() {
      document.querySelectorAll<HTMLElement>('.progress-fill[data-width]').forEach(el => {
        el.style.width = (el.dataset.width || '0') + '%'
      })
      document.querySelectorAll<HTMLElement>('.mini-bar-fill[data-width]').forEach(el => {
        el.style.width = (el.dataset.width || '0') + '%'
      })
      animateRadar()
    }

    // ── TIMELINE ──
    function animateTimeline() {
      document.querySelectorAll('.tl-step').forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 150)
      })
    }

    // ── INTERSECTION OBSERVER ──
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.card').forEach(c => c.classList.add('visible'))
          if (e.target.querySelector('.progress-fill')) animateBars()
          if (e.target.querySelector('.tl-step')) animateTimeline()
        }
      })
    }, { threshold: .2 })
    document.querySelectorAll('section').forEach(s => sectionObs.observe(s))
    setTimeout(animateBars, 800)
    setTimeout(animateTimeline, 1000)

    // ── GA4 TRACKING ──
    document.querySelector('.hero-cta-wrap')?.querySelectorAll('button').forEach(btn =>
      btn.addEventListener('click', () => window.gtag?.('event', 'demo_cta_click', { position: 'hero' }))
    )
    document.querySelector('.nav-cta')?.addEventListener('click', () =>
      window.gtag?.('event', 'demo_cta_click', { position: 'nav' }))
    document.querySelector('.footer-cta .btn-primary')?.addEventListener('click', () =>
      window.gtag?.('event', 'final_cta_click', { position: 'footer_cta' }))

    const sectionMap = [
      { id: 'hero', el: document.querySelector('.hero') as Element | null },
      { id: 'radar_chart', el: document.querySelectorAll('section')[0] as Element | null },
      { id: 'activity_chart', el: document.querySelectorAll('section')[1] as Element | null },
      { id: 'conversation_intelligence', el: document.querySelectorAll('section')[2] as Element | null },
      { id: 'timeline', el: document.querySelectorAll('section')[3] as Element | null },
      { id: 'street_intelligence', el: document.querySelectorAll('section')[4] as Element | null },
      { id: 'final_cta', el: document.querySelector('.footer-cta') as Element | null },
    ]
    const fired = new Set<Element>()
    const gaObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !fired.has(e.target)) {
          const found = sectionMap.find(s => s.el === e.target)
          if (found) { fired.add(e.target); window.gtag?.('event', 'section_view', { section_name: found.id }) }
        }
      })
    }, { threshold: .3 })
    sectionMap.forEach(s => { if (s.el) gaObs.observe(s.el) })

    const timeTimers = [30, 60, 120, 300].map(s =>
      setTimeout(() => window.gtag?.('event', 'time_on_page', { seconds: s }), s * 1000)
    )

    // ── EXIT INTENT ──
    let pageReadyAt: number | null = null
    const exitGuard = setTimeout(() => { pageReadyAt = Date.now() }, 10000)

    function showExitOverlay() {
      if (sessionStorage.getItem('exitShown')) return
      if (!pageReadyAt) return
      sessionStorage.setItem('exitShown', '1')
      setExitVisible(true)
      window.gtag?.('event', 'exit_intent_shown')
    }
    function onMouseLeave(e: MouseEvent) { if (e.clientY <= 0) showExitOverlay() }
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      clearTimeout(timer1); clearTimeout(timer2)
      clearInterval(tickInterval)
      chartObs.disconnect(); sectionObs.disconnect(); gaObs.disconnect()
      timeTimers.forEach(clearTimeout)
      clearTimeout(exitGuard)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  function handleExitClose() {
    setExitVisible(false)
    window.gtag?.('event', 'exit_intent_dismissed')
  }

  function handleExitSubmit() {
    const email = (document.getElementById('exit-email') as HTMLInputElement)?.value?.trim()
    window.gtag?.('event', 'exit_intent_submit', { email_provided: !!email })
    setExitVisible(false)
  }

  return (
    <>
      <canvas ref={canvasRef} id="particles" />

      {/* NAV */}
      <nav>
        <div className="logo">REVOLIS<span>.AI</span></div>
        <button className="nav-cta" onClick={() => { window.gtag?.('event', 'demo_cta_click', { position: 'nav' }); openModal('demo-nav') }}>Spusti Demo →</button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge">Live AI Demo · Bez registrácie</div>
        <h1>Kto odpovie ako prvý,<br /><em>uzavrie obchod.</em></h1>
        <p className="hero-sub">
          Revolis.AI vidí každý signál, každý záujem, každú príležitosť —
          a koná skôr, než klient zavolá <span>konkurencii</span>.
        </p>
        <div className="hero-cta-wrap">
          <button className="btn-primary" onClick={() => { window.gtag?.('event', 'demo_cta_click', { position: 'hero_primary' }); openModal('demo-hero') }}>Spusti živé demo →</button>
          <button className="btn-secondary" onClick={() => { window.gtag?.('event', 'demo_cta_click', { position: 'hero_secondary' }); document.querySelector('section')?.scrollIntoView({ behavior: 'smooth' }) }}>Pozri 2-min video</button>
        </div>
        <div className="ticker">
          <div className="tick-item">
            <div className="tick-num" id="t1">0</div>
            <div className="tick-label">Follow-upov dnes</div>
          </div>
          <div className="tick-item">
            <div className="tick-num" id="t2">0</div>
            <div className="tick-label">Prebudených príležitostí</div>
          </div>
          <div className="tick-item">
            <div className="tick-num" id="t3">0%</div>
            <div className="tick-label">Nárast konverzie</div>
          </div>
          <div className="tick-item">
            <div className="tick-num" id="t4">0h</div>
            <div className="tick-label">Ušetrených hodín dnes</div>
          </div>
        </div>
      </div>

      <hr className="full-divider" />

      {/* ── SEKCIA 1 — RADAR ── */}
      <section>
        <div className="section-title">Radar ktorý nikdy nespí</div>
        <p className="section-sub">Revolis.AI sleduje 47 behaviorálnych signálov na kontakt — nie len emaily. Priemerný čas odpovede: <strong style={{ color: 'var(--cyan)' }}>90 sekúnd</strong>.</p>
        <div className="radar-wrap">
          <div className="radar-svg-wrap">
            <svg width="300" height="300" viewBox="0 0 300 300" id="radarSvg">
              <g opacity=".15">
                <polygon points="150,30 255,90 255,210 150,270 45,210 45,90" fill="none" stroke="#00D4FF" strokeWidth="1" />
                <polygon points="150,66 222,108 222,192 150,234 78,192 78,108" fill="none" stroke="#00D4FF" strokeWidth="1" />
                <polygon points="150,102 189,126 189,174 150,198 111,174 111,126" fill="none" stroke="#00D4FF" strokeWidth="1" />
              </g>
              <line x1="150" y1="150" x2="150" y2="30" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <line x1="150" y1="150" x2="255" y2="90" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <line x1="150" y1="150" x2="255" y2="210" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <line x1="150" y1="150" x2="150" y2="270" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <line x1="150" y1="150" x2="45" y2="210" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <line x1="150" y1="150" x2="45" y2="90" stroke="#00D4FF" strokeWidth="1" opacity=".3" />
              <polygon id="radarPoly" points="150,150 150,150 150,150 150,150 150,150 150,150"
                fill="rgba(0,212,255,.15)" stroke="#00D4FF" strokeWidth="2" />
              <circle cx="150" cy="150" r="4" fill="#00D4FF" />
              <text x="150" y="20" textAnchor="middle" fontSize="11" fill="#94A3B8">Záujem</text>
              <text x="268" y="88" textAnchor="start" fontSize="11" fill="#94A3B8">Timeline</text>
              <text x="268" y="215" textAnchor="start" fontSize="11" fill="#94A3B8">Budget</text>
              <text x="150" y="288" textAnchor="middle" fontSize="11" fill="#94A3B8">Urgencia</text>
              <text x="32" y="215" textAnchor="end" fontSize="11" fill="#94A3B8">Riziko</text>
              <text x="32" y="88" textAnchor="end" fontSize="11" fill="#94A3B8">Motivácia</text>
            </svg>
          </div>
          <div className="radar-labels">
            <div style={{ fontSize: '16px', fontWeight: 800, marginBottom: '4px' }}>Ján Kováč — Kontakt #1,247</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>Aktualizované pred 8 minútami · Skóre: <span style={{ color: 'var(--green)', fontWeight: 800 }}>84/100</span></div>
            <div className="radar-label-item">
              <div className="radar-dot" style={{ background: 'var(--cyan)' }}></div>
              <div className="radar-label-text">Záujem o nehnuteľnosť</div>
              <div className="radar-label-val" style={{ color: 'var(--cyan)' }}>91%</div>
            </div>
            <div style={{ marginBottom: '8px' }}><div className="progress-bar"><div className="progress-fill" style={{ background: 'var(--cyan)' }} data-width="91"></div></div></div>
            <div className="radar-label-item">
              <div className="radar-dot" style={{ background: 'var(--green)' }}></div>
              <div className="radar-label-text">Timeline (kedy kúpi)</div>
              <div className="radar-label-val" style={{ color: 'var(--green)' }}>78%</div>
            </div>
            <div style={{ marginBottom: '8px' }}><div className="progress-bar"><div className="progress-fill" style={{ background: 'var(--green)' }} data-width="78"></div></div></div>
            <div className="radar-label-item">
              <div className="radar-dot" style={{ background: 'var(--purple)' }}></div>
              <div className="radar-label-text">Budget realita</div>
              <div className="radar-label-val" style={{ color: 'var(--purple)' }}>85%</div>
            </div>
            <div style={{ marginBottom: '8px' }}><div className="progress-bar"><div className="progress-fill" style={{ background: 'var(--purple)' }} data-width="85"></div></div></div>
            <div className="radar-label-item">
              <div className="radar-dot" style={{ background: 'var(--orange)' }}></div>
              <div className="radar-label-text">Urgencia</div>
              <div className="radar-label-val" style={{ color: 'var(--orange)' }}>67%</div>
            </div>
            <div style={{ marginBottom: '8px' }}><div className="progress-bar"><div className="progress-fill" style={{ background: 'var(--orange)' }} data-width="67"></div></div></div>
          </div>
        </div>
      </section>

      <hr className="full-divider" />

      {/* ── SEKCIA 2 — ACTIVITY CHART ── */}
      <section>
        <div className="section-title">Stratený obrat má svoju adresu</div>
        <p className="section-sub">73 % stratených obchodov bolo zachrániteľných. Toto je Vaša databáza — červená = peniaze ktoré odišli ku konkurencii.</p>
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
          <div className="card visible" style={{ borderColor: 'rgba(239,68,68,.2)' }}>
            <div className="card-icon">🔴</div>
            <div className="card-title" style={{ color: '#F87171' }}>Kritické — okamžitá akcia</div>
            <div className="card-desc">8 príležitostí s hodnotou 85k+ € — posledný kontakt 60+ dní</div>
            <div className="card-metric" style={{ color: '#F87171' }}>€ 212,400</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>odhadovaná ušlá provízia</div>
          </div>
          <div className="card visible" style={{ borderColor: 'rgba(249,115,22,.2)' }}>
            <div className="card-icon">🟠</div>
            <div className="card-title" style={{ color: 'var(--orange)' }}>Ohrozené — 30-60 dní</div>
            <div className="card-desc">14 príležitostí v chladiacom období — záujem ešte aktívny</div>
            <div className="card-metric" style={{ color: 'var(--orange)' }}>€ 89,600</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>zachrániteľné do 14 dní</div>
          </div>
          <div className="card visible" style={{ borderColor: 'rgba(34,197,94,.2)' }}>
            <div className="card-icon">🟢</div>
            <div className="card-title" style={{ color: 'var(--green)' }}>Prebudené tento mesiac</div>
            <div className="card-desc">Revolis reaktivoval 22 % dormantných kontaktov</div>
            <div className="card-metric" style={{ color: 'var(--green)' }}>+34 kontaktov</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>vrátilo sa do aktívneho dopytu</div>
          </div>
        </div>

        {/* Activity Area Chart */}
        <div style={{ marginTop: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#E2E8F0' }}>Aktivita príležitostí — posledných 30 dní</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>Počet interakcií · Reaktivácie · Nové dopyty</div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}><span style={{ width: '24px', height: '3px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }}></span>Aktívne</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}><span style={{ width: '24px', height: '3px', background: 'var(--green)', borderRadius: '2px', display: 'inline-block' }}></span>Reaktivované</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}><span style={{ width: '24px', height: '3px', background: 'var(--purple)', borderRadius: '2px', display: 'inline-block' }}></span>Nové</span>
            </div>
          </div>
          <div style={{ background: 'var(--navy2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 20px 16px', position: 'relative', overflow: 'hidden' }}>
            <svg id="activityChart" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: '100%', height: '160px', display: 'block' }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
                </linearGradient>
                <clipPath id="chartClip">
                  <rect id="clipRect" x="0" y="0" width="0" height="200" />
                </clipPath>
              </defs>
              <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
              <text x="6" y="38" fontSize="9" fill="rgba(255,255,255,.25)">80</text>
              <text x="6" y="78" fontSize="9" fill="rgba(255,255,255,.25)">60</text>
              <text x="6" y="118" fontSize="9" fill="rgba(255,255,255,.25)">40</text>
              <text x="6" y="158" fontSize="9" fill="rgba(255,255,255,.25)">20</text>
              <g clipPath="url(#chartClip)">
                <path id="areaCyan" d="M0,140 C27,130 53,115 80,105 C107,95 133,120 160,100 C187,80 213,60 240,55 C267,50 293,70 320,65 C347,60 373,40 400,35 C427,30 453,50 480,45 C507,40 533,25 560,30 C587,35 613,55 640,50 C667,45 693,30 720,25 C740,22 760,20 800,18 L800,200 L0,200 Z" fill="url(#gradCyan)" />
                <path id="lineCyan" d="M0,140 C27,130 53,115 80,105 C107,95 133,120 160,100 C187,80 213,60 240,55 C267,50 293,70 320,65 C347,60 373,40 400,35 C427,30 453,50 480,45 C507,40 533,25 560,30 C587,35 613,55 640,50 C667,45 693,30 720,25 C740,22 760,20 800,18" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" />
                <path id="areaGreen" d="M0,170 C27,165 53,160 80,155 C107,150 133,158 160,148 C187,138 213,130 240,125 C267,120 293,132 320,128 C347,124 373,115 400,110 C427,105 453,118 480,112 C507,106 533,98 560,102 C587,106 613,118 640,112 C667,106 693,95 720,90 C740,87 760,85 800,82 L800,200 L0,200 Z" fill="url(#gradGreen)" />
                <path id="lineGreen" d="M0,170 C27,165 53,160 80,155 C107,150 133,158 160,148 C187,138 213,130 240,125 C267,120 293,132 320,128 C347,124 373,115 400,110 C427,105 453,118 480,112 C507,106 533,98 560,102 C587,106 613,118 640,112 C667,106 693,95 720,90 C740,87 760,85 800,82" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,3" />
                <path id="areaPurple" d="M0,185 C27,182 53,178 80,175 C107,172 133,176 160,170 C187,164 213,158 240,155 C267,152 293,160 320,156 C347,152 373,146 400,143 C427,140 453,150 480,145 C507,140 533,135 560,138 C587,141 613,150 640,145 C667,140 693,133 720,130 C740,128 760,126 800,124 L800,200 L0,200 Z" fill="url(#gradPurple)" />
                <path id="linePurple" d="M0,185 C27,182 53,178 80,175 C107,172 133,176 160,170 C187,164 213,158 240,155 C267,152 293,160 320,156 C347,152 373,146 400,143 C427,140 453,150 480,145 C507,140 533,135 560,138 C587,141 613,150 640,145 C667,140 693,133 720,130 C740,128 760,126 800,124" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
                <circle id="peakDot" cx="800" cy="18" r="5" fill="#00D4FF" opacity="0">
                  <animate attributeName="opacity" values="0;1;0.7" begin="2s" dur="0.4s" fill="freeze" />
                  <animate attributeName="r" values="5;8;5" begin="2s" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="800" cy="18" r="3" fill="#fff" opacity="0">
                  <animate attributeName="opacity" values="0;1" begin="2s" dur="0.4s" fill="freeze" />
                </circle>
                <g opacity="0" id="peakTooltip">
                  <animate attributeName="opacity" values="0;1" begin="2.2s" dur="0.3s" fill="freeze" />
                  <rect x="700" y="2" width="96" height="28" rx="6" fill="rgba(0,212,255,.15)" stroke="rgba(0,212,255,.4)" strokeWidth="1" />
                  <text x="748" y="12" fontSize="8" fill="#00D4FF" textAnchor="middle" fontWeight="800">PEAK DEN 30</text>
                  <text x="748" y="24" fontSize="9" fill="#fff" textAnchor="middle" fontWeight="700">78 interakcií</text>
                </g>
              </g>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', borderTop: '1px solid rgba(255,255,255,.05)', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>Deň 1</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>Deň 7</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>Deň 14</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>Deň 21</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>Deň 28</span>
              <span style={{ fontSize: '10px', color: 'var(--cyan)', fontWeight: 700 }}>Dnes</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: 'var(--navy2)', border: '1px solid rgba(0,212,255,.15)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--cyan)' }} id="chartStat1">0</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>Aktívnych interakcií</div>
            </div>
            <div style={{ background: 'var(--navy2)', border: '1px solid rgba(34,197,94,.15)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--green)' }} id="chartStat2">0</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>Reaktivácií</div>
            </div>
            <div style={{ background: 'var(--navy2)', border: '1px solid rgba(124,58,237,.15)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#A78BFA' }} id="chartStat3">0</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>Nových dopytov</div>
            </div>
          </div>
        </div>
      </section>

      <hr className="full-divider" />

      {/* ── SEKCIA 3 — CONVERSATION INTELLIGENCE ── */}
      <section>
        <div className="section-title">Viete presne kedy ste stratili klienta.</div>
        <p className="section-sub">37 sekúnd pred koncom hovoru. James Thornton (ex Gong): <em style={{ color: '#A78BFA' }}>čo maklér nepovedal je silnejší signál ako čo povedal.</em></p>
        <div className="waveform-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Hovor — Marta Nováková · 4:12 min</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Identifikované 3 buying signály · 1 missed opportunity</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--orange)' }}>64/100</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Deal Score</div>
            </div>
          </div>
          <div className="waveform-bars" id="waveformBars"></div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(34,197,94,.15)', color: '#4ADE80', border: '1px solid rgba(34,197,94,.3)' }}>🟢 Buying signal</span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(239,68,68,.15)', color: '#F87171', border: '1px solid rgba(239,68,68,.3)' }}>🔴 Lost control</span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(249,115,22,.15)', color: '#FB923C', border: '1px solid rgba(249,115,22,.3)' }}>🟠 Talking too much</span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(59,130,246,.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,.3)' }}>🔵 Neutral</span>
          </div>
          <div className="transcript-line">
            <div className="tl-marker" style={{ background: 'var(--green)' }}></div>
            <div className="transcript-text">&ldquo;Tá nehnuteľnosť na Galvaniho — myslíte že ešte bude voľná budúci týždeň?&rdquo;</div>
            <span className="transcript-badge" style={{ background: 'rgba(34,197,94,.15)', color: '#4ADE80' }}>BUYING SIGNAL</span>
          </div>
          <div className="transcript-line">
            <div className="tl-marker" style={{ background: 'var(--orange)' }}></div>
            <div className="transcript-text">Maklér: &ldquo;Áno, viete, tých bytov v tej oblasti je viac, mohli by sme pozrieť aj iné lokality ako...&rdquo;</div>
            <span className="transcript-badge" style={{ background: 'rgba(249,115,22,.15)', color: '#FB923C' }}>ODBOČENIE</span>
          </div>
          <div className="transcript-line">
            <div className="tl-marker" style={{ background: 'var(--red)' }}></div>
            <div className="transcript-text">&ldquo;Musím sa poradiť s manželom. Ozvem sa.&rdquo; <em style={{ color: 'var(--red)' }}>[koniec hovoru]</em></div>
            <span className="transcript-badge" style={{ background: 'rgba(239,68,68,.15)', color: '#F87171' }}>STRATENÁ KONTROLA</span>
          </div>
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,212,255,.05)', borderRadius: '12px', border: '1px solid rgba(0,212,255,.15)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--cyan)', marginBottom: '6px' }}>💡 AI ODPORÚČANIE</div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>Klientka prejavila záujem o konkrétnu nehnuteľnosť. Správna odpoveď: <span style={{ color: '#fff', fontWeight: 700 }}>&ldquo;Áno, reservujem vám prehliadku na stredu o 17:00?&rdquo;</span> — namiesto odbočenia na alternatívy. Pravdepodobnosť úspechu by stúpla z 31 % na 74 %.</div>
          </div>
        </div>
      </section>

      <hr className="full-divider" />

      {/* ── SEKCIA 4 — TIMELINE ── */}
      <section>
        <div className="section-title">Deň 1 SMS. Deň 847 — výročie kúpy.</div>
        <p className="section-sub">Všetko automatické. Maklér neklikne nič — systém pracuje na pozadí 5 rokov.</p>
        <div className="timeline" id="timeline">
          {[
            { emoji: '📱', day: 'Deň 1', channel: 'SMS uvítanie', color: '#22C55E', glow: 'rgba(34,197,94,.3)' },
            { emoji: '📧', day: 'Deň 3', channel: 'Email ponuka', color: '#60A5FA', glow: 'rgba(96,165,250,.3)' },
            { emoji: '💬', day: 'Deň 5', channel: 'WhatsApp', color: 'var(--cyan)', glow: 'rgba(0,212,255,.3)' },
            { emoji: '🔔', day: 'Deň 7', channel: 'Push notif', color: 'var(--purple)', glow: 'rgba(124,58,237,.3)' },
            { emoji: '📅', day: 'Mesiac 6', channel: 'Check-in AI', color: 'var(--gold)', glow: 'rgba(212,175,55,.3)' },
            { emoji: '🏠', day: 'Rok 1', channel: 'Výročie kúpy', color: 'var(--orange)', glow: 'rgba(249,115,22,.3)' },
            { emoji: '⭐', day: 'Rok 3', channel: 'Trh report', color: 'var(--green)', glow: 'rgba(34,197,94,.3)' },
            { emoji: '👥', day: 'Rok 5', channel: 'Odporúčanie', color: '#F472B6', glow: 'rgba(244,114,182,.3)' },
          ].map((step, i) => (
            <div key={i} className="tl-step">
              <div className="tl-dot" style={{ borderColor: step.color, boxShadow: `0 0 20px ${step.glow}` }}>{step.emoji}</div>
              <div className="tl-day">{step.day}</div>
              <div className="tl-channel">{step.channel}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="full-divider" />

      {/* ── SEKCIA 5 — STREET INTELLIGENCE ── */}
      <section>
        <div className="section-title">Váš klient si myslí že pozná svoju ulicu.</div>
        <p className="section-sub">Vy ju poznáte lepšie — Trevor Blackwood (ex Market Leader): Street-level insight na úrovni konkrétnej adresy.</p>
        <div className="street-card">
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '20px', letterSpacing: '.1em', textTransform: 'uppercase' }}>📍 Galvaniho 7, Bratislava</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div><div className="street-stat-val" id="stat1">0</div><div className="street-stat-label">Predajov za 18 mes.</div></div>
              <div><div className="street-stat-val" id="stat2">0d</div><div className="street-stat-label">Priem. čas predaja</div></div>
              <div><div className="street-stat-val" id="stat3">0</div><div className="street-stat-label">€/m² priemer</div></div>
              <div><div className="street-stat-val" id="stat4">0</div><div className="street-stat-label">Aktívnych kupujúcich</div></div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,212,255,.05)', borderRadius: '12px', border: '1px solid rgba(0,212,255,.15)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--cyan)', marginBottom: '6px' }}>KONVERZAČNÉ ODPORÚČANIE</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>&ldquo;V tejto lokalite predaj trvá priemerne 34 dní. Podobný byt sa predal minulý mesiac za €3,480/m². Môžem vám ukázať analýzu hodnoty?&rdquo;</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '16px', letterSpacing: '.1em', textTransform: 'uppercase' }}>Cenová trajektória (€/m²)</div>
            <div className="mini-bar-chart">
              {[
                { year: '2022', width: 55, opacity: '.6', price: '€2,890' },
                { year: '2023', width: 70, opacity: '.7', price: '€3,120' },
                { year: '2024', width: 85, opacity: '.85', price: '€3,380' },
                { year: '2025', width: 95, opacity: '1', price: '€3,480' },
              ].map(row => (
                <div key={row.year} className="mini-bar-row">
                  <span style={{ width: '50px' }}>{row.year}</span>
                  <div className="mini-bar-track"><div className="mini-bar-fill" data-width={row.width} style={{ background: `rgba(0,212,255,${row.opacity})` }}></div></div>
                  <span>{row.price}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(34,197,94,.05)', borderRadius: '10px', border: '1px solid rgba(34,197,94,.2)' }}>
              <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 800 }}>↑ +20.4% za 3 roky</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Lokalita rastie nadpriemerne voči mestu (+7.2%)</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <div className="footer-cta">
        <div className="usp-tag">★ World&rsquo;s First · Kombinácia neexistuje nikde inde</div>
        <h2>Každý deň bez Revolis.AI<br />Vás stojí konkrétnu sumu.</h2>
        <p>Spusti 14-dňový trial. Bez kreditnej karty. Prvý AI follow-up odchádza za 4 minúty.</p>
        <button className="btn-primary" style={{ fontSize: '16px', padding: '20px 48px' }} onClick={() => { window.gtag?.('event', 'final_cta_click', { position: 'footer_cta' }); openModal('demo-footer') }}>Začni zadarmo — výsledky do 48 hodín →</button>
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)' }}>847 maklérov začalo tento mesiac · Zrušenie kedykoľvek</div>
      </div>

      {leadModal !== null && (
        <LeadCaptureModal source={leadModal} onClose={() => setLeadModal(null)} />
      )}

      {/* EXIT-INTENT OVERLAY */}
      <div
        id="exit-overlay"
        role="dialog"
        aria-modal={true}
        aria-labelledby="exit-title"
        className={exitVisible ? 'active' : ''}
        onClick={e => { if (e.target === e.currentTarget) handleExitClose() }}
      >
        <div className="exit-card">
          <button className="exit-close" aria-label="Zatvoriť" onClick={handleExitClose}>&#x2715;</button>
          <div className="exit-title" id="exit-title">Počkajte — toto ste ešte nevideli.</div>
          <div className="exit-sub">Ukážeme Vám živé dáta pre Vašu oblasť. Bez registrácie.</div>
          <input className="exit-input" id="exit-email" type="email" placeholder="vas@email.sk" autoComplete="email" />
          <button className="exit-btn" onClick={handleExitSubmit}>Zobraziť moje dáta →</button>
        </div>
      </div>
    </>
  )
}
