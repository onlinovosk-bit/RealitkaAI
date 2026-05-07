'use client'
import { useEffect, useState } from 'react'
import LeadCaptureModal from '../components/LeadCaptureModal'

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export default function HomePage() {
  const [leadModal, setLeadModal] = useState<string | null>(null)
  const openModal = (source: string) => setLeadModal(source)

  function toggleFaq(btn: HTMLButtonElement) {
    const item = btn.closest('.faq-item')!
    const wasOpen = item.classList.contains('open')
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'))
    if (!wasOpen) {
      item.classList.add('open')
      const questionText = btn.querySelector('span:first-child')?.textContent?.trim() || btn.textContent.replace('+','').trim()
      window.gtag?.('event', 'faq_interaction', { question: questionText })
    }
  }

  useEffect(() => {
    // ── COUNTER ANIMATION ──
    function animCount(el: HTMLElement, target: number, suffix = '', duration = 1800) {
      let start: number | null = null
      function step(ts: number) {
        if (!start) start = ts
        const p = Math.min((ts - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 3)
        const val = Math.floor(ease * target)
        el.textContent = val.toLocaleString() + suffix
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    // Stats strip on load
    const statsTimer = setTimeout(() => {
      const ids: [string, number, string][] = [
        ['s1', 34, '%'], ['s2', 90, 's'], ['s3', 22, '%'],
        ['s4', 61000, '€'], ['s5', 67, '%'], ['s6', 4, 'min']
      ]
      ids.forEach(([id, val, suf]) => {
        const el = document.getElementById(id)
        if (el) animCount(el, val, suf)
      })
    }, 400)

    // ── INTERSECTION OBSERVER ──
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        e.target.querySelectorAll('.pain-card').forEach((c, i) =>
          setTimeout(() => c.classList.add('visible'), i * 80))
        e.target.querySelectorAll('.feature-row').forEach((r, i) =>
          setTimeout(() => r.classList.add('visible'), i * 100))
        e.target.querySelectorAll('.number-cell').forEach((c, i) =>
          setTimeout(() => c.classList.add('visible'), i * 80))
        e.target.querySelectorAll('.price-card').forEach((c, i) =>
          setTimeout(() => c.classList.add('visible'), i * 100))
        e.target.querySelectorAll<HTMLElement>('.score-bar-fill[data-w]').forEach(el =>
          setTimeout(() => { el.style.width = (el.dataset.w || '0') + '%' }, 300))
        const nc: Record<string, [number, string]> = {
          n1: [34, '%'], n2: [90, 's'], n3: [22, '%'],
          n4: [61000, '€'], n5: [67, '%'], n6: [4, 'min']
        }
        Object.entries(nc).forEach(([id, [val, suf]]) => {
          const el = document.getElementById(id)
          if (el && e.target.contains(el)) animCount(el, val, suf)
        })
      })
    }, { threshold: .15 })

    document.querySelectorAll('.section,.pain-grid,.feature-row,.numbers-grid,.pricing-grid').forEach(el => obs.observe(el))

    // ── STEPS + DAYLIFE OBSERVER ──
    const stepsObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        stepsObs.unobserve(e.target)
        if (e.target.id === 'stepsWrap') {
          const arcTargets = [{ id: 'arc1', deg: 120 }, { id: 'arc2', deg: 240 }, { id: 'arc3', deg: 360 }]
          document.querySelectorAll('.step-card').forEach((c, i) => {
            setTimeout(() => {
              c.classList.add('visible')
              const arc = arcTargets[i]
              if (arc) {
                const el = document.getElementById(arc.id)
                if (el) setTimeout(() => el.style.setProperty('--arc', arc.deg + 'deg'), 200)
              }
            }, i * 180)
          })
          setTimeout(() => document.getElementById('conn1')?.classList.add('visible'), 120)
          setTimeout(() => document.getElementById('conn2')?.classList.add('visible'), 300)
        }
        if (e.target.id === 'daylifeStrip') {
          e.target.querySelectorAll('.daylife-item').forEach((item, i) =>
            setTimeout(() => item.classList.add('visible'), i * 120))
        }
      })
    }, { threshold: .1 })

    const stepsWrap = document.getElementById('stepsWrap')
    const daylifeStrip = document.getElementById('daylifeStrip')
    if (stepsWrap) stepsObs.observe(stepsWrap)
    if (daylifeStrip) stepsObs.observe(daylifeStrip)

    // ── ROI CALCULATOR ──
    const sliderLeads = document.getElementById('roi-leads') as HTMLInputElement
    const sliderComm = document.getElementById('roi-comm') as HTMLInputElement
    const sliderConv = document.getElementById('roi-conv') as HTMLInputElement
    if (sliderLeads && sliderComm && sliderConv) {
      const elLeadsVal = document.getElementById('roi-leads-val')!
      const elCommVal = document.getElementById('roi-comm-val')!
      const elConvVal = document.getElementById('roi-conv-val')!
      const elCurrent = document.getElementById('roi-out-current')!
      const elRevolis = document.getElementById('roi-out-revolis')!
      const elMonthly = document.getElementById('roi-out-monthly')!
      const elYearly = document.getElementById('roi-out-yearly')!

      function animNum(el: HTMLElement & { dataset: DOMStringMap }, target: number, prefix: string, suffix: string, duration: number) {
        const start = parseInt(el.dataset.displayed || '0') || 0
        el.dataset.displayed = String(target)
        const diff = target - start
        let startTime: number | null = null
        function step(ts: number) {
          if (!startTime) startTime = ts
          const p = Math.min((ts - startTime) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          const val = Math.round(start + diff * ease)
          el.textContent = prefix + val.toLocaleString('sk-SK') + suffix
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }

      function updateSliderFill(slider: HTMLInputElement) {
        const min = parseFloat(slider.min)
        const max = parseFloat(slider.max)
        const val = parseFloat(slider.value)
        const pct = ((val - min) / (max - min)) * 100
        slider.style.setProperty('--pct', pct + '%')
      }

      function compute() {
        const leads = parseInt(sliderLeads.value)
        const comm = parseInt(sliderComm.value)
        const conv = parseFloat(sliderConv.value)
        const currentRevenue = Math.round(leads * (conv / 100) * comm)
        const revolisRevenue = Math.round(leads * ((conv * 1.34) / 100) * comm)
        const monthlyGain = revolisRevenue - currentRevenue
        const yearlyGain = monthlyGain * 12
        elLeadsVal.textContent = String(leads)
        elCommVal.textContent = comm.toLocaleString('sk-SK') + ' €'
        elConvVal.textContent = conv.toFixed(1) + ' %'
        animNum(elCurrent as HTMLElement & { dataset: DOMStringMap }, currentRevenue, '', ' €/mes', 300)
        animNum(elRevolis as HTMLElement & { dataset: DOMStringMap }, revolisRevenue, '', ' €/mes', 300)
        animNum(elMonthly as HTMLElement & { dataset: DOMStringMap }, monthlyGain, '+', ' €', 300)
        animNum(elYearly as HTMLElement & { dataset: DOMStringMap }, yearlyGain, '+', ' €', 300)
        updateSliderFill(sliderLeads)
        updateSliderFill(sliderComm)
        updateSliderFill(sliderConv)
      }

      sliderLeads.addEventListener('input', compute)
      sliderComm.addEventListener('input', compute)
      sliderConv.addEventListener('input', compute)
      updateSliderFill(sliderLeads)
      updateSliderFill(sliderComm)
      updateSliderFill(sliderConv)
      compute()
    }

    // GA4 CTA click tracking moved to React onClick handlers on each button

    const sectionIds = ['hero', 'features', 'how_it_works', 'numbers', 'pricing', 'faq', 'final_cta']
    const sectionEls = [
      document.querySelector('.hero'),
      document.querySelector('.pain-grid')?.closest('.section'),
      document.getElementById('stepsWrap')?.parentElement?.parentElement,
      document.querySelector('.numbers-grid')?.parentElement?.parentElement,
      document.querySelector('.pricing-grid-full')?.closest('.section'),
      document.querySelector('.faq-list')?.parentElement?.parentElement,
      document.querySelector('.final-cta')
    ]
    const fired = new Set<Element>()
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !fired.has(e.target)) {
          fired.add(e.target)
          const idx = sectionEls.indexOf(e.target)
          if (idx >= 0) window.gtag?.('event', 'section_view', { section_name: sectionIds[idx] })
        }
      })
    }, { threshold: 0.3 })
    sectionEls.forEach(el => { if (el) sectionObs.observe(el) })

    const timeTimers = [30, 60, 120, 300].map(s =>
      setTimeout(() => window.gtag?.('event', 'time_on_page', { seconds: s }), s * 1000)
    )

    return () => {
      clearTimeout(statsTimer)
      obs.disconnect()
      stepsObs.disconnect()
      sectionObs.disconnect()
      timeTimers.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="logo">REVOLIS<span>.AI</span></div>
        <div className="nav-links">
          <a href="#">Features</a>
          <a href="/demo">Demo</a>
          <a href="#">Cenník</a>
          <a href="#">Blog</a>
        </div>
        <button className="nav-cta" onClick={() => { window.gtag?.('event', 'hero_cta_click', { position: 'nav' }); openModal('nav') }}>Získať prístup →</button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-eyebrow">
          <span className="live-dot"></span>
          340+ kancelárií · 6 krajín · Live
        </div>
        <h1>Revolis.AI ukazuje maklérom, komu zavolať ako prvému.<br /><em>A automaticky stráži follow-upy.</em></h1>
        <p className="hero-sub">
          <strong>AI odporúča. Maklér rozhoduje.</strong>{' '}
          Žiadne stratené leady. Žiadne zabudnuté follow-upy. Majiteľ vidí čo sa deje — bez mikromanagementu.
        </p>
        <div className="hero-cta-row">
          <button className="btn-dark" onClick={() => { window.gtag?.('event', 'hero_cta_click', { position: 'hero' }); openModal('hero') }}>
            Spusti Revolis.AI za 4 minúty
            <span style={{ opacity: .6 }}>→</span>
          </button>
          <a href="/demo" className="btn-outline" style={{ textDecoration: 'none' }} onClick={() => window.gtag?.('event', 'hero_secondary_click', { cta_text: 'Pozri 2-min demo' })}>Pozri 2-min demo</a>
        </div>
        <div className="trust-bar">
          <div className="trust-item"><span className="trust-check">✓</span> AI odporúča. Maklér rozhoduje.</div>
          <div className="trust-item"><span className="trust-check">✓</span> Žiadne osobné dáta klientov neopúšťajú vašu agentúru</div>
          <div className="trust-item"><span className="trust-check">✓</span> Bez dlhodobých záväzkov</div>
          <div className="trust-item"><span className="trust-check">✓</span> Trial bez záväzkov</div>
          <div className="trust-item"><span className="trust-check">✓</span> Nastavenie za 4 minúty</div>
          <div className="trust-item"><span className="trust-check">✓</span> Zrušenie kedykoľvek</div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="stats-strip">
          <div className="stat-cell"><div className="stat-num" id="s1">0%</div><div className="stat-label">Nárast zmlúv za Q1</div></div>
          <div className="stat-cell"><div className="stat-num" id="s2">0s</div><div className="stat-label">Priem. čas odpovede</div></div>
          <div className="stat-cell"><div className="stat-num" id="s3">0%</div><div className="stat-label">Reaktivovaných príležitostí</div></div>
          <div className="stat-cell"><div className="stat-num" id="s4">0€</div><div className="stat-label">Priem. nový obrat Q1</div></div>
          <div className="stat-cell"><div className="stat-num" id="s5">0%</div><div className="stat-label">Menej nekvalif. hovorov</div></div>
          <div className="stat-cell"><div className="stat-num" id="s6">0min</div><div className="stat-label">Čas nasadenia</div></div>
        </div>
      </div>

      {/* PAIN */}
      <div className="section">
        <div className="section-label">Problém</div>
        <div className="section-h2">Bolí Vás toto?</div>
        <p className="section-p">Každý maklér pozná tieto momenty. Každý z nich je stratená provízia.</p>
        <div className="pain-grid">
          <div className="pain-card"><div className="pain-icon">😴</div><div className="pain-title">Dopyt prišiel o 22:47. Odpovedali ste ráno. Bolo neskoro.</div><div className="pain-text">Prvý kto odpovie dostane príležitosť. Priemerný čas odpovede makléra: 7 hodín. Revolis.AI: 90 sekúnd, 24/7.</div></div>
          <div className="pain-card"><div className="pain-icon">👻</div><div className="pain-title">Písali ste mu pred 3 mesiacmi. Kúpil od niekoho iného.</div><div className="pain-text">Mal záujem. Bol "ešte nie pripravený." Vypadol z radaru. Revolis by ho sledoval 18 mesiacov automaticky.</div></div>
          <div className="pain-card"><div className="pain-icon">💸</div><div className="pain-title">68 % príležitostí nebolo nikdy druhýkrát kontaktovaných.</div><div className="pain-text">CRM zaznamenáva. Revolis.AI aktívne pracuje s databázou každý deň — bez Vášho vstupu.</div></div>
          <div className="pain-card"><div className="pain-icon">🚪</div><div className="pain-title">Maklér odišiel. Jeho príležitosti odišli s ním.</div><div className="pain-text">Revolis drží vzťahy na úrovni kancelárie — nie v telefóne jednotlivca. Nikdy viac.</div></div>
          <div className="pain-card"><div className="pain-icon">❓</div><div className="pain-title">Minuli ste 1 200 € na reklamu. Neviete ktorá fungovala.</div><div className="pain-text">Revolis.AI mapuje každú príležitosť od prvej reklamy po podpis. Škálujete len to, čo prináša podpisy.</div></div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="section" style={{ paddingTop: 32 }}>
        <div className="section-label">Riešenie</div>
        <div className="section-h2">Čo Revolis.AI robí za Vás</div>
        <p className="section-p">Nie ďalší CRM ktorý musíte aktualizovať. Systém ktorý pracuje namiesto Vás — každú hodinu.</p>

        <div className="feature-row">
          <div>
            <div className="feat-label" style={{ color: 'var(--cyan)' }}>AI Lead Scoring</div>
            <div className="feat-title">Viete kto kúpi tento mesiac.</div>
            <p className="feat-desc">Revolis analyzuje správanie každej príležitosti a priradí skóre 1–100. Vy zavoláte len tým s 80+. Čas na nekvalifikovaných príležitostiach: −67 %.</p>
            <div className="feat-contrast">
              <div className="contrast-box contrast-before"><div className="contrast-label">Bez Revolis</div>Voláš všetkým. 9 z 10 hovorov je zbytočných. Únava, frustrácia, strata motivácie.</div>
              <div className="contrast-box contrast-after"><div className="contrast-label">S Revolis.AI</div>Voláš tým, ktorí sú pripravení. 3× vyššia konverzia hovoru na stretnutie.</div>
            </div>
          </div>
          <div className="feat-visual">
            <div className="feat-vis-header">Lead Scoring — Vaše kontakty dnes</div>
            <div>
              <div className="score-row"><div className="score-name">Ján Kováč</div><div className="score-bar-track"><div className="score-bar-fill" data-w="91" style={{ background: 'linear-gradient(90deg,#22C55E,#4ADE80)' }}></div></div><div className="score-val" style={{ color: '#4ADE80' }}>91</div></div>
              <div className="score-row"><div className="score-name">Marta Horáková</div><div className="score-bar-track"><div className="score-bar-fill" data-w="84" style={{ background: 'linear-gradient(90deg,#22C55E,#4ADE80)' }}></div></div><div className="score-val" style={{ color: '#4ADE80' }}>84</div></div>
              <div className="score-row"><div className="score-name">Peter Benko</div><div className="score-bar-track"><div className="score-bar-fill" data-w="71" style={{ background: 'linear-gradient(90deg,#0EA5E9,#38BDF8)' }}></div></div><div className="score-val" style={{ color: '#38BDF8' }}>71</div></div>
              <div className="score-row"><div className="score-name">Lucia Tóthová</div><div className="score-bar-track"><div className="score-bar-fill" data-w="58" style={{ background: 'linear-gradient(90deg,#F59E0B,#FCD34D)' }}></div></div><div className="score-val" style={{ color: '#FCD34D' }}>58</div></div>
              <div className="score-row"><div className="score-name">Rastislav Horák</div><div className="score-bar-track"><div className="score-bar-fill" data-w="29" style={{ background: 'linear-gradient(90deg,#EF4444,#F87171)' }}></div></div><div className="score-val" style={{ color: '#F87171' }}>29</div></div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,.15)', color: '#4ADE80' }}>🟢 Zavolaj teraz: 2</span>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(14,165,233,.15)', color: '#38BDF8' }}>🔵 Sleduj: 1</span>
              <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,.15)', color: '#F87171' }}>🔴 Nurture: 2</span>
            </div>
          </div>
        </div>

        <div className="feature-row reverse">
          <div>
            <div className="feat-label" style={{ color: '#7C3AED' }}>24/7 AI Response Engine</div>
            <div className="feat-title">Odpoveď za 90 sekúnd. Vždy.</div>
            <p className="feat-desc">Každý dopyt dostane personalizovanú odpoveď do 90 sekúnd. AI píše v tóne Vašej kancelárie, v jazyku klienta, s konkrétnou nehnuteľnosťou.</p>
            <div className="feat-contrast">
              <div className="contrast-box contrast-before"><div className="contrast-label">Bez Revolis</div>Prvý hovor až ráno. Lead si medzitým zobral 3 ďalšie kontakty a vybral si.</div>
              <div className="contrast-box contrast-after"><div className="contrast-label">S Revolis.AI</div>Lead dostane odpoveď skôr ako odíde zo stránky. Konverzácia začína ihneď.</div>
            </div>
          </div>
          <div className="feat-visual">
            <div className="feat-vis-header">Live Response Feed — posledná hodina</div>
            <div className="funnel">
              <div className="funnel-stage" style={{ background: 'rgba(124,58,237,.15)', color: '#A78BFA' }}><span>Prichádzajúce dopyty</span><span className="funnel-val">47</span></div>
              <div className="funnel-stage" style={{ background: 'rgba(14,165,233,.15)', color: '#38BDF8' }}><span>Odpovedané do 90s</span><span className="funnel-val">47</span></div>
              <div className="funnel-stage" style={{ background: 'rgba(34,197,94,.15)', color: '#4ADE80' }}><span>Potvrdené stretnutia</span><span className="funnel-val">12</span></div>
              <div className="funnel-stage" style={{ background: 'rgba(212,175,55,.15)', color: '#FCD34D' }}><span>Kvalifikovaných príležitostí</span><span className="funnel-val">8</span></div>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(34,197,94,.08)', borderRadius: 10, border: '1px solid rgba(34,197,94,.15)', fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
              ✓ Priemerný čas odpovede dnes: <strong style={{ color: '#4ADE80' }}>74 sekúnd</strong>
            </div>
          </div>
        </div>

        <div className="feature-row">
          <div>
            <div className="feat-label" style={{ color: '#D97706' }}>Vaše mŕtve príležitosti nie sú mŕtve.</div>
            <div className="feat-title">Revolis prebúdza databázu. Každý deň.</div>
            <p className="feat-desc">Priemerná kancelária reaktivuje 22 % príležitostí starších ako 6 mesiacov. Nadia Kovač (ex Structurely): záujem nikdy nezomrie — len spí.</p>
            <div className="feat-contrast">
              <div className="contrast-box contrast-before"><div className="contrast-label">Bez Revolis</div>Lead "nie, ešte nie" = zabudnutý navždy. Databáza rastie, obrat nie.</div>
              <div className="contrast-box contrast-after"><div className="contrast-label">S Revolis.AI</div>18-mesačný nurturing. Reaktivačná rate 22 %. Nové obchody z príležitostí za ktoré ste zaplatili.</div>
            </div>
          </div>
          <div className="feat-visual">
            <div className="feat-vis-header">Porovnanie — Revolis.AI vs. štandardný CRM</div>
            <table className="comp-table">
              <thead><tr><th>Feature</th><th>Revolis.AI</th><th>Štandard CRM</th></tr></thead>
              <tbody>
                <tr><td>24/7 auto-odpoveď</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
                <tr><td>AI lead scoring</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
                <tr><td>Dormant reaktivácia</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
                <tr><td>Conversation intel.</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
                <tr><td>Multi-jazyčná AI</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
                <tr><td>Marketing attribution</td><td className="check-yes">✓</td><td style={{ color: 'rgba(255,255,255,.3)' }}>Čiastočne</td></tr>
                <tr><td>5-ročný rel. plán</td><td className="check-yes">✓</td><td className="check-no">✗</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding: '96px 24px', background: 'var(--white)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">Ako to funguje</div>
            <div className="section-h2">Od registrácie po prvý uzavretý obchod.<br />Bez IT oddelenia.</div>
          </div>
          <div className="steps-wrap" id="stepsWrap">
            <div className="step-connector" id="conn1"></div>
            <div className="step-connector right" id="conn2"></div>
            <div className="step-card" id="step1">
              <div className="step-num-wrap" style={{'--arc': '0deg'} as React.CSSProperties} id="arc1">
                <div className="step-num-inner"><div className="step-icon">🔌</div><div className="step-num" style={{ color: 'var(--cyan)' }}>Krok 1</div></div>
              </div>
              <div className="step-title">Napojte kanceláriu</div>
              <div className="step-desc">Pripojte email, importujte kontakty z CRM alebo CSV. Revolis.AI sa automaticky naučí Váš štýl komunikácie.</div>
              <div className="step-time" style={{ background: 'rgba(14,165,233,.08)', color: 'var(--cyan)', border: '1px solid rgba(14,165,233,.2)' }}>⚡ 4 minúty</div>
            </div>
            <div className="step-card" id="step2">
              <div className="step-num-wrap" style={{'--arc': '0deg'} as React.CSSProperties} id="arc2">
                <div className="step-num-inner"><div className="step-icon">🧠</div><div className="step-num" style={{ color: 'var(--purple)' }}>Krok 2</div></div>
              </div>
              <div className="step-title">AI sa naučí Vás</div>
              <div className="step-desc">Počas prvých 24 hodín Revolis.AI analyzuje históriu kontaktov, identifikuje vzorce a nastaví scoring model pre Váš trh.</div>
              <div className="step-time" style={{ background: 'rgba(124,58,237,.08)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,.2)' }}>⏱ 24 hodín</div>
            </div>
            <div className="step-card" id="step3">
              <div className="step-num-wrap" style={{'--arc': '0deg'} as React.CSSProperties} id="arc3">
                <div className="step-num-inner"><div className="step-icon">🏆</div><div className="step-num" style={{ color: 'var(--gold)' }}>Krok 3</div></div>
              </div>
              <div className="step-title">Uzatvárajte obchody</div>
              <div className="step-desc">Od tohto momentu Revolis.AI pracuje na pozadí — odpovedá, sleduje, reaktivuje. Vy dostávate len notifikácie: "zavolaj teraz."</div>
              <div className="step-time" style={{ background: 'rgba(217,119,6,.08)', color: 'var(--gold)', border: '1px solid rgba(217,119,6,.2)' }}>∞ Navždy automaticky</div>
            </div>
          </div>
          <div className="daylife-strip" id="daylifeStrip">
            <div style={{ position: 'absolute', top: 16, right: 24, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Typický deň makléra s Revolis.AI</div>
            <div className="daylife-item"><div className="daylife-time" style={{ color: 'var(--cyan)' }}>07:58</div><div className="daylife-action">Denný briefing</div><div className="daylife-detail">AI pripravila 5 priorít dňa. Ján Kováč má skóre 91 — prvý hovor.</div><span className="daylife-tag" style={{ background: 'rgba(14,165,233,.15)', color: '#38BDF8' }}>Automatické</span></div>
            <div className="daylife-item"><div className="daylife-time" style={{ color: 'var(--green)' }}>09:14</div><div className="daylife-action">Nový dopyt z portálu</div><div className="daylife-detail">AI odpovedala za 67 sekúnd. Ponúkla 2 nehnuteľnosti, navrhla termín.</div><span className="daylife-tag" style={{ background: 'rgba(34,197,94,.15)', color: '#4ADE80' }}>90 sekúnd</span></div>
            <div className="daylife-item"><div className="daylife-time" style={{ color: 'var(--purple)' }}>11:30</div><div className="daylife-action">Reaktivácia</div><div className="daylife-detail">AI kontaktovala 3 dormantné kontakty. Jeden odpovedal: „Áno, teraz som pripravený."</div><span className="daylife-tag" style={{ background: 'rgba(124,58,237,.15)', color: '#A78BFA' }}>AI iniciovala</span></div>
            <div className="daylife-item"><div className="daylife-time" style={{ color: 'var(--gold)' }}>14:45</div><div className="daylife-action">Hot Alert</div><div className="daylife-detail">Kontakt Marta N. dosiahla skóre 88. Notifikácia: „Zavolaj teraz, okno je otvorené."</div><span className="daylife-tag" style={{ background: 'rgba(217,119,6,.15)', color: '#FCD34D' }}>Skóre 88/100</span></div>
            <div className="daylife-item"><div className="daylife-time" style={{ color: '#F472B6' }}>22:47</div><div className="daylife-action">Nočný dopyt</div><div className="daylife-detail">Záujemca odoslal dopyt. AI odpovedala okamžite. Maklér spal. Stretnutie je naplánované.</div><span className="daylife-tag" style={{ background: 'rgba(244,114,182,.15)', color: '#F472B6' }}>Maklér spal</span></div>
          </div>
        </div>
      </div>

      {/* NUMBERS */}
      <div style={{ background: 'var(--bg2)', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-label" style={{ textAlign: 'center' }}>Výsledky</div>
            <div className="section-h2" style={{ textAlign: 'center' }}>Čísla hovoria za nás</div>
          </div>
          <div className="numbers-grid">
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--cyan)' }} id="n1">0%</div><div className="number-label">Nárast zmlúv za Q1</div><div className="number-ctx">Priemerná kancelária, prvých 90 dní</div></div>
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--purple)' }} id="n2">0s</div><div className="number-label">Čas odpovede</div><div className="number-ctx">Vs. 7-hodinový priemer trhu</div></div>
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--green)' }} id="n3">0%</div><div className="number-label">Reaktivovaných príležitostí</div><div className="number-ctx">Z príležitostí starších ako 6 mesiacov</div></div>
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--gold)' }} id="n4">0€</div><div className="number-label">Priemerný nový obrat</div><div className="number-ctx">5–15 maklérov, prvý kvartál</div></div>
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--red)' }} id="n5">0%</div><div className="number-label">Menej zbytočných hovorov</div><div className="number-ctx">Vďaka AI lead scoringu</div></div>
            <div className="number-cell"><div className="number-big" style={{ color: 'var(--cyan)' }} id="n6">0min</div><div className="number-label">Čas nasadenia</div><div className="number-ctx">Od registrácie po prvú AI odpoveď</div></div>
          </div>
        </div>
      </div>

      {/* ROI CALCULATOR */}
      <div className="roi-section">
        <div className="roi-inner">
          <div style={{ textAlign: 'center' }}>
            <div className="section-label">Návratnosť investície</div>
            <div className="section-h2">Vaša kancelária. 80 príležitostí. 4 500 € provízia. Výsledok nižšie.</div>
            <p className="section-p" style={{ margin: '0 auto 0', textAlign: 'center' }}>Posuňte slidery podľa Vašej kancelárie — výsledok sa prepočíta okamžite.</p>
          </div>
          <div className="roi-grid">
            <div className="roi-inputs">
              <div>
                <div className="roi-input-label">Počet príležitostí mesačne<span className="roi-input-val" id="roi-leads-val">80</span></div>
                <input className="roi-slider" id="roi-leads" type="range" min="10" max="500" step="1" defaultValue="80" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}><span>10</span><span>500</span></div>
              </div>
              <div>
                <div className="roi-input-label">Priemerná provízia (€)<span className="roi-input-val" id="roi-comm-val">4 500 €</span></div>
                <input className="roi-slider" id="roi-comm" type="range" min="1000" max="15000" step="100" defaultValue="4500" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}><span>1 000 €</span><span>15 000 €</span></div>
              </div>
              <div>
                <div className="roi-input-label">Aktuálna konverzná miera (%)<span className="roi-input-val" id="roi-conv-val">3.0 %</span></div>
                <input className="roi-slider" id="roi-conv" type="range" min="0.5" max="20" step="0.5" defaultValue="3" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}><span>0.5 %</span><span>20 %</span></div>
              </div>
              <div style={{ padding: 20, background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>Ako to funguje</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>Revolis.AI zvyšuje konverznú mieru o <strong style={{ color: 'var(--text)' }}>+34 %</strong> vďaka AI lead scoringu, okamžitým odpoveďam a reaktivácii dormantných príležitostí.</div>
              </div>
            </div>
            <div className="roi-result">
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 20 }}>Výsledky pre Vašu kanceláriu</div>
              <div className="roi-result-row"><div className="roi-result-label">Váš aktuálny obrat</div><div className="roi-result-num current" id="roi-out-current">0 €/mes</div></div>
              <div className="roi-result-row"><div className="roi-result-label">S Revolis.AI</div><div className="roi-result-num revolis" id="roi-out-revolis">0 €/mes</div></div>
              <div className="roi-result-row" style={{ paddingTop: 20 }}><div className="roi-result-label">Mesačný nárast</div><div className="roi-result-num monthly" id="roi-out-monthly">+0 €</div></div>
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 8 }}>Ročný nárast</div>
                <div className="roi-result-num yearly" id="roi-out-yearly">+0 €</div>
                <div className="roi-result-yearly-label">Za 12 mesiacov s Revolis.AI</div>
              </div>
              <div className="roi-cta-wrap"><button className="roi-cta-btn" onClick={() => { window.gtag?.('event', 'roi_cta_click'); openModal('roi') }}>Aktivovať Revolis.AI →</button></div>
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="section" style={{ maxWidth: 1300 }}>
        <div className="section-label" style={{ textAlign: 'center' }}>Cenník</div>
        <div className="section-h2" style={{ textAlign: 'center' }}>Vyberte plán pre Vašu kanceláriu.</div>
        <p className="section-p" style={{ textAlign: 'center', margin: '0 auto 56px' }}>Žiadne skryté poplatky. Žiadne obmedzenia na počet nehnuteľností. Zrušenie kedykoľvek.</p>
        <div className="pricing-grid-full">

          {/* SMART START */}
          <div className="price-card visible" style={{ borderColor: '#CBD5E1' }}>
            <div className="founder-tag" style={{ background: 'rgba(100,116,139,.1)', color: '#64748B', border: '1px solid #CBD5E1' }}>Zakladateľská cena</div>
            <div className="plan-name" style={{ color: 'var(--muted)' }}>Smart Start</div>
            <div className="orig-price">98 €/mes</div>
            <div className="plan-price">49 <span className="plan-period">€/mes</span></div>
            <div className="plan-tagline" style={{ color: 'var(--muted)' }}>Ideálny štart pre samostatných maklérov. Prvé výsledky do 7 dní.</div>
            <hr className="plan-divider" style={{ borderColor: 'var(--border)', margin: '16px 0' }} />
            <div className="feat-section-title" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>Tím a limity</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>Do 3 maklérov v tíme</li><li style={{ color: 'var(--muted)' }}>Do 100 príležitostí mesačne</li><li style={{ color: 'var(--muted)' }}>100% garancia vrátenia do 30 dní</li></ul>
            <div className="feat-section-title" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>AI Asistent &amp; Komunikácia</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>🤖 AI Asistent — odpovede do 2 min (pracovné hodiny)</li><li style={{ color: 'var(--muted)' }}>📱 WhatsApp + SMS automatické odpovede</li><li style={{ color: 'var(--muted)' }}>📧 AI email skripty personalizované správaním klienta</li><li style={{ color: 'var(--muted)' }}>⚡ One-click follow-up — AI navrhne, Vy schválite</li></ul>
            <div className="feat-section-title" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>Scoring &amp; Analytika</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>📊 Buyer Readiness Index — AI skóre každej príl.</li><li style={{ color: 'var(--muted)' }}>🏠 Auto-párovanie s nehnuteľnosťami (do 10/mes)</li><li style={{ color: 'var(--muted)' }}>📋 Denný AI briefing — 5 priorít každé ráno o 8:00</li><li style={{ color: 'var(--muted)' }}>🔔 Hot Alert — notif. pri skóre 75+</li><li style={{ color: 'var(--muted)' }}>📝 Základná analytika konverzií (týždenný report)</li></ul>
            <div className="feat-section-title" style={{ color: '#7C3AED', borderColor: '#DDD6FE' }}>⭐ Expert bonusy</div>
            <div className="expert-bonus" style={{ background: '#F5F3FF', borderColor: '#7C3AED' }}><div className="expert-bonus-label" style={{ color: '#7C3AED' }}>Oliver Strauss · ex Wise Agent</div><div className="expert-bonus-text" style={{ color: '#4C1D95' }}>Neviditeľná AI — každá feature je 1 klik. Maklér ani nevie že používa AI, len vidí výsledky.</div></div>
            <div className="expert-bonus" style={{ background: '#FFF7ED', borderColor: '#EA580C' }}><div className="expert-bonus-label" style={{ color: '#EA580C' }}>Amara Osei · ex LionDesk</div><div className="expert-bonus-text" style={{ color: '#7C2D12' }}>Tichá 7-dňová sekvencia — SMS deň 1, email deň 3, WhatsApp deň 5, push deň 7. Všetko na pozadí bez akcie makléra.</div></div>
            <button className="plan-cta" style={{ background: 'var(--bg2)', color: 'var(--text)', marginTop: 20 }} onClick={() => { window.gtag?.('event', 'pricing_cta_click', { plan_name: 'Smart Start', plan_price: '49' }); openModal('pricing-smart-start') }}>Aktivovať Smart Start →</button>
          </div>

          {/* ACTIVE FORCE */}
          <div className="price-card visible" style={{ borderColor: '#BAE6FD' }}>
            <div className="founder-tag" style={{ background: 'rgba(14,165,233,.08)', color: 'var(--cyan)', border: '1px solid rgba(14,165,233,.25)' }}>Zakladateľská cena</div>
            <div className="plan-name" style={{ color: 'var(--cyan)' }}>RADAR MAKLÉRA</div>
            <div className="orig-price">198 €/mes</div>
            <div className="plan-price">99 <span className="plan-period">€/mes</span></div>
            <div className="plan-tagline" style={{ color: 'var(--muted)' }}>Plný AI arzenál pre aktívneho makléra. Sofia AI 24/7 aj v noci.</div>
            <hr className="plan-divider" style={{ borderColor: '#BAE6FD', margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(14,165,233,.07)', border: '1px solid rgba(14,165,233,.2)', marginBottom: 4 }}><span style={{ fontSize: 14 }}>📦</span><span style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)' }}>Obsahuje všetko zo Smart Start</span></div>
            <div className="feat-section-title" style={{ color: 'var(--cyan)', borderColor: '#BAE6FD' }}>Licencia</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>1 maklérska licencia (plný prístup)</li><li style={{ color: 'var(--muted)' }}>30-dňová garancia vrátenia</li></ul>
            <div className="feat-section-title" style={{ color: 'var(--cyan)', borderColor: '#BAE6FD' }}>AI Asistent 24/7</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>🤖 AI Asistent 24/7 — odpovede aj o polnoci</li><li style={{ color: 'var(--muted)' }}>📞 AI analýza hovorov — prepis + kľúčové momenty</li><li style={{ color: 'var(--muted)' }}>🎯 Detekcia záujmu klienta v reálnom čase</li><li style={{ color: 'var(--muted)' }}>⚡ Automatické follow-upy (7-dňové sekvencie)</li></ul>
            <div className="feat-section-title" style={{ color: 'var(--cyan)', borderColor: '#BAE6FD' }}>Scoring &amp; Predikcia</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>🧠 Prediktívne skórovanie obchodov (ML model)</li><li style={{ color: 'var(--muted)' }}>📊 Predpoveď obratu (mesačná)</li><li style={{ color: 'var(--muted)' }}>🗺 Teritoriálna inteligencia — analýza lokality</li></ul>
            <div className="feat-section-title" style={{ color: 'var(--cyan)', borderColor: '#BAE6FD' }}>Integrácie</div>
            <ul className="plan-features"><li style={{ color: 'var(--muted)' }}>🔗 Portálové integrácie (Nehnuteľnosti.sk, Reality.sk…)</li></ul>
            <div className="feat-section-title" style={{ color: '#0891B2', borderColor: '#A5F3FC' }}>⭐ Expert bonusy</div>
            <div className="expert-bonus" style={{ background: '#F0FDFF', borderColor: '#0891B2' }}><div className="expert-bonus-label" style={{ color: '#0891B2' }}>Nadia Kovač · ex Structurely</div><div className="expert-bonus-text" style={{ color: '#164E63' }}>Lead Half-Life Calculator — každá príležitosť má vypočítaný „bod rozpadu" záujmu. AI kontaktuje príležitosť presne v optimálnom okamihu, nie keď má maklér čas.</div></div>
            <div className="expert-bonus" style={{ background: '#F0FDF4', borderColor: '#16A34A' }}><div className="expert-bonus-label" style={{ color: '#16A34A' }}>Riku Tanaka · ex Follow Up Boss</div><div className="expert-bonus-text" style={{ color: '#14532D' }}>Triple Match Score — správny maklér × správny čas × správna správa = 4.2× vyššia miera odpovede. AI vypočíta kombináciu automaticky.</div></div>
            <div className="expert-bonus" style={{ background: '#FDF4FF', borderColor: '#9333EA' }}><div className="expert-bonus-label" style={{ color: '#9333EA' }}>James Thornton · ex Gong</div><div className="expert-bonus-text" style={{ color: '#581C87' }}>SK/CZ Conversation Intelligence — natívna analýza hovorov v slovenčine a češtine. 340 buying signálov špecifických pre realitný trh.</div></div>
            <button className="plan-cta" style={{ background: 'rgba(14,165,233,.1)', color: 'var(--cyan)', border: '1px solid rgba(14,165,233,.25)', marginTop: 20 }} onClick={() => { window.gtag?.('event', 'pricing_cta_click', { plan_name: 'RADAR MAKLÉRA', plan_price: '99' }); openModal('pricing-active-force') }}>Aktivovať RADAR MAKLÉRA →</button>
          </div>

          {/* MARKET VISION */}
          <div className="price-card featured visible">
            <div className="badge-popular">★ Najpopulárnejší</div>
            <div className="founder-tag" style={{ background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.15)' }}>Zakladateľská cena</div>
            <div className="plan-name" style={{ color: 'rgba(255,255,255,.5)' }}>STRÁŽCA CIEN A ZISKOV</div>
            <div className="orig-price" style={{ color: 'rgba(255,255,255,.3)' }}>398 €/mes</div>
            <div className="plan-price" style={{ color: '#fff' }}>199 <span className="plan-period" style={{ color: 'rgba(255,255,255,.35)' }}>€/mes</span></div>
            <div className="plan-tagline" style={{ color: 'rgba(255,255,255,.5)' }}>Tímová licencia pre majiteľa. Owner vidí tím, maklér má Active Force.</div>
            <hr className="plan-divider" style={{ borderColor: 'rgba(255,255,255,.1)', margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', marginBottom: 4 }}><span style={{ fontSize: 14 }}>📦</span><span style={{ fontSize: 12, fontWeight: 800, color: '#38BDF8' }}>Obsahuje všetko z Active Force</span></div>
            <div className="feat-section-title" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,.2)' }}>Licencia &amp; Tím</div>
            <ul className="plan-features" style={{ color: 'rgba(255,255,255,.7)' }}><li>👑 Owner: Market Vision menu (exkluzívny dashboard)</li><li>1× Active Force licencia pre makléra v tíme</li><li>30-dňová garancia vrátenia</li></ul>
            <div className="feat-section-title" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,.2)' }}>Owner Intelligence</div>
            <ul className="plan-features" style={{ color: 'rgba(255,255,255,.7)' }}><li>✅ Kto je pripravený kúpiť — live zoznam</li><li>✅ Dnes uzavriem — AI denná prioritizácia</li><li>📊 Prehľad výkonnosti celého tímu</li><li>🎯 Hodnotenie výkonnosti maklérov (KPI)</li><li>📝 Predpoveď obratu pre celý tím</li><li>📋 Manažérske reporty (týždenné + mesačné)</li></ul>
            <div className="feat-section-title" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,.2)' }}>AI Reaktivácia &amp; Analytika</div>
            <ul className="plan-features" style={{ color: 'rgba(255,255,255,.7)' }}><li>📍 Prebúdza starých klientov ktorí Vás zabudli</li><li>🧠 Tímový AI mozog — zdieľané znalosti</li><li>⚡ Prioritná podpora (24h odozva)</li></ul>
            <div className="feat-section-title" style={{ color: '#67E8F9', borderColor: 'rgba(103,232,249,.2)' }}>⭐ Expert bonusy</div>
            <div className="expert-bonus" style={{ background: 'rgba(255,255,255,.06)', borderColor: '#38BDF8' }}><div className="expert-bonus-label" style={{ color: '#38BDF8' }}>Elena Vasquez · ex HubSpot</div><div className="expert-bonus-text" style={{ color: 'rgba(255,255,255,.65)' }}>Automatický obsahový magnet — klient dostane personalizovaný market report bez toho aby o to žiadal. Maklér vyzerá ako expert, bez práce.</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(255,255,255,.06)', borderColor: '#4ADE80' }}><div className="expert-bonus-label" style={{ color: '#4ADE80' }}>Dmitri Volkov · ex BoomTown</div><div className="expert-bonus-text" style={{ color: 'rgba(255,255,255,.65)' }}>ROI Ticker — každá feature zobrazuje svoju €/mes hodnotu priamo v UI. „Tento follow-up ušetril 3.2h = +€124 pri Vašej hodinovej sadzbe."</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(255,255,255,.06)', borderColor: '#A78BFA' }}><div className="expert-bonus-label" style={{ color: '#A78BFA' }}>Yuki Nakamura · ex Notion</div><div className="expert-bonus-text" style={{ color: 'rgba(255,255,255,.65)' }}>3 pohľady jedným klikom — Board (pipeline), Table (analytika), Calendar (časovanie). Každý maklér si vyberie čo mu sedí.</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(255,255,255,.06)', borderColor: '#FCD34D' }}><div className="expert-bonus-label" style={{ color: '#FCD34D' }}>Trevor Blackwood · ex Market Leader</div><div className="expert-bonus-text" style={{ color: 'rgba(255,255,255,.65)' }}>Street-Level Insight — maklér príde na stretnutie s dátami o klientovej ulici ktoré klient nikde nenájde. Priemerné ceny, čas predaja, aktívni kupujúci v lokalite.</div></div>
            <button className="plan-cta" style={{ background: 'var(--cyan)', color: 'var(--dark)', marginTop: 20 }} onClick={() => { window.gtag?.('event', 'pricing_cta_click', { plan_name: 'STRÁŽCA CIEN A ZISKOV', plan_price: '199' }); openModal('pricing-market-vision') }}>Aktivovať STRÁŽCA CIEN A ZISKOV →</button>
          </div>

          {/* PROTOCOL AUTHORITY */}
          <div className="price-card visible" style={{ border: '2px solid #D4AF37', background: 'linear-gradient(160deg,#FFFBEB 0%,#FFF 60%)' }}>
            <div className="founder-tag" style={{ background: 'rgba(217,119,6,.12)', color: '#92400E', border: '1px solid #FDE68A' }}>Zakladateľská cena</div>
            <div className="plan-name" style={{ color: '#92400E' }}>REALITY MONOPOL</div>
            <div className="orig-price" style={{ color: '#D97706' }}>898 €/mes</div>
            <div className="plan-price" style={{ color: '#92400E' }}>449 <span className="plan-period" style={{ color: '#D97706' }}>€/mes</span></div>
            <div className="plan-tagline" style={{ color: '#78350F' }}>Najvyšší level. Owner má Protocol menu, 4 makléri dostanú Active Force.</div>
            <hr className="plan-divider" style={{ borderColor: '#FDE68A', margin: '16px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(217,119,6,.1)', border: '1px solid #FDE68A', marginBottom: 4 }}><span style={{ fontSize: 14 }}>📦</span><span style={{ fontSize: 12, fontWeight: 800, color: '#B45309' }}>Obsahuje všetko z Market Vision</span></div>
            <div className="feat-section-title" style={{ color: '#B45309', borderColor: '#FDE68A' }}>Licencia &amp; Tím</div>
            <ul className="plan-features" style={{ color: '#78350F' }}><li>👑 Owner: Protocol Authority menu (najvyšší level)</li><li>4× Active Force licencie pre maklérov</li><li>30-dňová garancia vrátenia</li></ul>
            <div className="feat-section-title" style={{ color: '#B45309', borderColor: '#FDE68A' }}>Protocol Intelligence</div>
            <ul className="plan-features" style={{ color: '#78350F' }}><li>✅ Kto je pripravený kúpiť — live, celá sieť</li><li>✅ Dnes uzavriem — AI cross-team prioritizácia</li><li>🗺 Competition Heatmap — živý radar konkurencie</li><li>🛡 Štít anonymného režimu — skryté akcie</li><li>🧠 Neurónová spravodajská sieť (Neural Intelligence)</li><li>📊 Medzitímová analytika (cross-agency benchmark)</li><li>🏢 Správa viacerých pobočiek z jedného miesta</li></ul>
            <div className="feat-section-title" style={{ color: '#B45309', borderColor: '#FDE68A' }}>Pokročilá Reaktivácia</div>
            <ul className="plan-features" style={{ color: '#78350F' }}><li>💻 Prebúdza starých klientov — pokročilý AI režim</li><li>⎈ Dedikovaný Protocol manažér (osobný kontakt)</li><li>⚡ SLA 99.99% uptime garantovaný zmluvou</li></ul>
            <div className="feat-section-title" style={{ color: '#D97706', borderColor: '#FDE68A' }}>⭐ Expert bonusy — TOP výber pre majiteľov</div>
            <div className="expert-bonus" style={{ background: 'rgba(239,68,68,.06)', borderColor: '#DC2626' }}><div className="expert-bonus-label" style={{ color: '#DC2626' }}>Marcus Chen · ex kvCORE</div><div className="expert-bonus-text" style={{ color: '#7F1D1D' }}>Silence Revenue Map — vizuálna mapa ukazuje kde PRESNE na mape maklér prichádza o peniaze kvôli žiadnej akcii. „Toto je Váš ušlý obrat za 90 dní."</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(124,58,237,.06)', borderColor: '#7C3AED' }}><div className="expert-bonus-label" style={{ color: '#7C3AED' }}>Priya Sharma · ex Salesforce Einstein</div><div className="expert-bonus-text" style={{ color: '#3B0764' }}>Revenue Probability Score — „Táto rodina kúpi do 47 dní, pravdepodobnosť 84 %, pretože…" Explicitné vysvetlenie, nie čierna skrinka. Fortune 500 AI pre každého makléra.</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(14,165,233,.06)', borderColor: '#0EA5E9' }}><div className="expert-bonus-label" style={{ color: '#0EA5E9' }}>Aiden O&apos;Sullivan · ex Lofty/Chime</div><div className="expert-bonus-text" style={{ color: '#0C4A6E' }}>Life Moment Detection — algoritmus deteguje životné zmeny klienta (sťahovanie, zmena práce, rodina) PRED tým než to klient sám vie. Okno príležitosti: 2–3 týždne.</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(22,163,74,.06)', borderColor: '#16A34A' }}><div className="expert-bonus-label" style={{ color: '#16A34A' }}>Sofia Reyes · ex Real Geeks</div><div className="expert-bonus-text" style={{ color: '#14532D' }}>Revealed Preference Engine — rozdiel medzi čo klient píše (stated) a čo klikne (revealed) = skutočný budget a motivácia. Maklér dostane brief: „Nekomunikuj cenu. Komunikuj priestor."</div></div>
            <div className="expert-bonus" style={{ background: 'rgba(217,119,6,.06)', borderColor: '#D97706' }}><div className="expert-bonus-label" style={{ color: '#D97706' }}>Cassandra Mills · ex Top Producer</div><div className="expert-bonus-text" style={{ color: '#78350F' }}>5-Year Relationship Horizon — po každom uzavretom obchode sa automaticky spustí 5-ročný plán: výročie kúpy, trhový update, refinančné okno, predpoveď apreciácie, žiadosť o odporúčanie.</div></div>
            <button className="plan-cta" style={{ background: 'linear-gradient(135deg,#D97706,#B45309)', color: '#fff', marginTop: 20, fontSize: 13 }} onClick={() => { window.gtag?.('event', 'pricing_cta_click', { plan_name: 'REALITY MONOPOL', plan_price: '449' }); openModal('pricing-protocol-authority') }}>★ Aktivovať REALITY MONOPOL →</button>
          </div>

        </div>
      </div>

      {/* REVENUE SCAN REPORT */}
      <div className="rscan-section">
        <div className="rscan-inner">
          <div className="rscan-eyebrow">
            <span>★</span> Jednorazová služba — bez predplatného
          </div>
          <div className="rscan-headline">
            Máte v databáze<br /><em>spiace peniaze.</em><br />Nevíte o nich.
          </div>
          <p className="rscan-sub">
            Priemerná kancelária má 400+ kontaktov. 22 % z nich dnes hľadá investičný byt, rodinný dom alebo predáva — a vy o tom neviete, pretože vám to nikto nepovedal.
          </p>

          <div className="rscan-grid">
            {/* LEFT — what you get */}
            <div>
              <div className="rscan-what">
                <div className="rscan-what-title">Čo dostanete do 24 hodín</div>
                <div className="rscan-item">
                  <div className="rscan-item-icon">🔍</div>
                  <div className="rscan-item-text">
                    <strong>Zoznam spiacich príležitostí</strong>
                    <span>Konkrétni ľudia z vašej databázy, ktorí sú dnes pripravení kupovať alebo predávať — aj keď ste s nimi nekomunikovali mesiace.</span>
                  </div>
                </div>
                <div className="rscan-item">
                  <div className="rscan-item-icon">📊</div>
                  <div className="rscan-item-text">
                    <strong>BRI skóre každého kontaktu</strong>
                    <span>Buyer Readiness Index 0–100 pre každý kontakt, doplnený o aktuálne trhové signály z vášho regiónu.</span>
                  </div>
                </div>
                <div className="rscan-item">
                  <div className="rscan-item-icon">📞</div>
                  <div className="rscan-item-text">
                    <strong>Čo presne povedať</strong>
                    <span>Pre každý kontakt: odporúčaná akcia, optimálny kanál (telefón / správa / email) a script prvej vety.</span>
                  </div>
                </div>
                <div className="rscan-item">
                  <div className="rscan-item-icon">🗺️</div>
                  <div className="rscan-item-text">
                    <strong>Trhový kontext vášho regiónu</strong>
                    <span>AI porovná vaše kontakty s aktuálnymi signálmi trhu — ceny, dopyt, aktivita v lokalite — a zvýrazní časové okná.</span>
                  </div>
                </div>
                <div className="rscan-item">
                  <div className="rscan-item-icon">📄</div>
                  <div className="rscan-item-text">
                    <strong>PDF report + CSV export</strong>
                    <span>Importovateľný priamo do vášho CRM. Každý kontakt s plným kontextom, nie len skóre.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — sample output */}
            <div>
              <div className="rscan-sample">
                <div className="rscan-sample-label">
                  <span>🔎</span> Ukážka výstupu Revenue Scan
                </div>

                <div className="rscan-contact-card">
                  <div className="rscan-bri-row">
                    <div className="rscan-contact-name">Ján Novák</div>
                    <div className="rscan-bri-score">78</div>
                  </div>
                  <div className="rscan-bri-row" style={{ marginBottom: 8 }}>
                    <div className="rscan-bri-label">Posledný kontakt: pred 14 mesiacmi</div>
                    <div className="rscan-bri-label">BRI skóre</div>
                  </div>
                  <div className="rscan-contact-meta">
                    Záujem: investičný byt · Bratislava III · budget ~180 000 €
                  </div>
                  <div className="rscan-contact-why">
                    💡 BA III ceny +9 % YoY · podobný profil kupoval Q1 · okno sa zatvára do 6 týždňov
                  </div>
                  <div className="rscan-action-chip">📞 Zavolaj tento týždeň</div>
                </div>

                <div className="rscan-contact-card">
                  <div className="rscan-bri-row">
                    <div className="rscan-contact-name">Marta Horáková</div>
                    <div className="rscan-bri-score">64</div>
                  </div>
                  <div className="rscan-bri-row" style={{ marginBottom: 8 }}>
                    <div className="rscan-bri-label">Posledný kontakt: pred 9 mesiacmi</div>
                    <div className="rscan-bri-label">BRI skóre</div>
                  </div>
                  <div className="rscan-contact-meta">
                    Záujem: rodinný dom · Košice okolie · budget ~250 000 €
                  </div>
                  <div className="rscan-contact-why">
                    💡 Košice výstavba spomalila · dopyt po domoch +18 % · jej deti idú na školu → načasovanie ideálne
                  </div>
                  <div className="rscan-action-chip">📧 Pošli market report</div>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 12, fontStyle: 'italic' }}>
                  * Ukážka je anonymizovaná. Váš Revenue Scan bude obsahovať reálne mená z vašej databázy.
                </div>
              </div>
            </div>
          </div>

          {/* PRICING BOX */}
          <div className="rscan-pricing-box">
            <div className="rscan-pricing-row">
              <div>
                <div className="rscan-price-group">
                  <div className="rscan-price-tag">Revenue Scan Report — jednorazovo</div>
                  <div className="rscan-price-main"><sup>€</sup>149</div>
                  <div className="rscan-price-sub">
                    Aktívni predplatitelia Revolis.AI: <strong style={{ color: 'rgba(167,139,250,.9)' }}>99 €</strong> &nbsp;·&nbsp; Pri ročnom upgrade: <strong style={{ color: 'rgba(74,222,128,.8)' }}>zadarmo</strong>
                  </div>
                </div>
                <div className="rscan-trust-row">
                  <div className="rscan-trust-item"><span>✓</span> Výsledky do 24 hodín</div>
                  <div className="rscan-trust-item"><span>✓</span> GDPR compliant — vaše dáta neopustia EU</div>
                  <div className="rscan-trust-item"><span>✓</span> Bez predplatného</div>
                  <div className="rscan-trust-item"><span>✓</span> Import priamo do CRM</div>
                </div>
                <div className="rscan-no-plan">
                  Nepotrebujete Revolis.AI plán. Ale väčšina klientov ho objedná potom, čo uvidia výsledky.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                <button
                  className="rscan-cta-btn"
                  onClick={() => {
                    window.gtag?.('event', 'rscan_cta_click', { position: 'pricing_box' })
                    openModal('revenue-scan')
                  }}
                >
                  Spustiť Revenue Scan Report →
                </button>
                <div className="rscan-subscriber-note">
                  <span>🎁</span> Aktívni predplatitelia: Revenue Scan za 99 € · Pri ročnom upgrade: zadarmo
                </div>
              </div>
            </div>
          </div>

          {/* SOCIAL PROOF */}
          <div style={{ marginTop: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, padding: '20px 24px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#A78BFA', marginBottom: 4 }}>8.4</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>príležitostí v priemere</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Priemerný počet aktívnych spiacich kontaktov objavených na 1 Revenue Scan</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, padding: '20px 24px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#4ADE80', marginBottom: 4 }}>22 %</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>konverzná miera</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Kontaktov odhalených Revenue Scanom, ktoré konvertovali do 60 dní</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, padding: '20px 24px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#FCD34D', marginBottom: 4 }}>14 900 €</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>priemerné ROI Revenue Scanu</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>Hodnota uzavretých obchodov z prvého Revenue Scanu · pri priemernej provízi 2 400 €</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: 'var(--bg2)', padding: '96px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="section-label" style={{ textAlign: 'center' }}>FAQ</div>
          <div className="section-h2" style={{ textAlign: 'center', marginBottom: 48 }}>Otázky ktoré Vám napadnú</div>
          <div className="faq-list">
            {[
              ['Máme už CRM. Prečo potrebujeme ešte jedno?', 'Revolis.AI nie je CRM. CRM zaznamenáva čo sa stalo — Revolis robí to, čo sa má stať. Integruje sa s Vašim CRM za 8 minút a začne pracovať s databázou, ktorú už máte.'],
              ['Naši makléri nebudú chcieť ďalší systém na učenie.', 'Priemerný čas prvej aktívnej akcie makléra v Revolis.AI: 11 minút. Maklér dostane notifikáciu "zavolaj teraz tomuto klientovi" — nemusí otvoriť nič iné. Systém pracuje za neho.'],
              ['AI nenapíše správu tak dobre ako naši makléri.', 'AI píše v tóne Vašej kancelárie, trénovaná na Vašich najlepších konverziách. Po 30 dňoch Revolis.AI píše lepšie ako priemerný maklér — nikdy nie je unavená, nikdy nezabudne čo klient hovoril minule.'],
              ['Sú naše dáta v bezpečí?', 'EU servery, GDPR compliant, AES-256 šifrovanie. Vaše dáta nie sú nikdy zdieľané ani použité na tréning modelov. Plná exportovateľnosť kedykoľvek, bez poplatku.'],
              ['Je to drahé bez záruk výsledku?', 'Smart Start 49 €/mes. Jeden reaktivovaný záujemca = priemerná provízia 2 400 €. ROI pri prvom reaktivovanom kontakte: 4 800 %. Kontaktujte nás a dohodneme podmienky skúšobného obdobia priamo pre Vašu kanceláriu.'],
              ['Nemáme čas na implementáciu teraz.', 'Implementácia trvá 4 minúty — registrácia, pripojenie emailu, nahratie databázy. Revolis začne pracovať so starými príležitosťami okamžite. Druhý najlepší čas je teraz.'],
            ].map(([q, a], i) => (
              <div className="faq-item" key={i}>
                <button className="faq-q" onClick={(e) => toggleFaq(e.currentTarget)}>
                  {q}<span className="faq-icon">+</span>
                </button>
                <div className="faq-a">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="final-cta">
        <h2>Dnes v noci príde 8 dopytov.<br />Bez Revolis.AI ich všetky dostane konkurencia.</h2>
        <p>340 kancelárií sa rozhodlo prestať strácať príležitosti v noci, cez víkend a počas dovoleniek.</p>
        <button className="final-cta-btn" onClick={() => { window.gtag?.('event', 'final_cta_click', { position: 'footer_cta' }); openModal('final-cta') }}>Aktivovať Revolis.AI pre moju kanceláriu →</button>
        <div className="final-micro">Bez záväzkov · Zrušenie kedykoľvek · Prvý AI follow-up za 4 minúty</div>
      </div>

      {leadModal !== null && (
        <LeadCaptureModal source={leadModal} onClose={() => setLeadModal(null)} />
      )}
    </>
  )
}
