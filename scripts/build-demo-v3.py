#!/usr/bin/env python3
"""Transform revolis-demo-v2.html → v3 per Prompt 2."""
import json
import pathlib
import re

src = pathlib.Path(r"C:\Users\aondr\Downloads\revolis-demo-v2.html").read_text(encoding="utf-8")
html = src

html = html.replace("html{scroll-behavior:smooth}", "html{scroll-behavior:smooth}\n  section[id]{scroll-margin-top:80px}")
html = html.replace(":root{", ":root{\n    --gap-section:30px;")

old_hot = (
    ".score.hot{background:rgba(251,191,36,.13);color:var(--hot);position:relative}\n"
    "  .score.hot::before{content:\"\";position:absolute;left:-14px;top:50%;transform:translateY(-50%);"
    "width:6px;height:6px;border-radius:50%;background:var(--hot);animation:pulse 1.6s ease-out infinite}"
)
new_hot = (
    ".score.hot{background:rgba(251,191,36,.13);color:var(--hot);position:relative;padding-left:18px}\n"
    "  .score.hot::before{content:\"\";position:absolute;left:6px;top:50%;transform:translateY(-50%);"
    "width:6px;height:6px;border-radius:50%;background:var(--hot);animation:pulse 1.6s ease-out infinite}"
)
html = html.replace(old_hot, new_hot)

html = html.replace(
    ".btn:focus-visible{outline:2px solid #fff;outline-offset:3px}",
    ".btn:focus-visible{outline:2px solid #fff;outline-offset:3px}\n  .btn:active{transform:scale(.98)}",
)
html = html.replace("section{padding:66px 0}", "section{padding:var(--gap-section) 0}\n  .center{text-align:center}")

old_sticky = (
    ".sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:60;"
    "padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(11,10,18,.92);"
    "backdrop-filter:blur(10px);border-top:1px solid var(--line);display:none}"
)
new_sticky = (
    ".sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:60;"
    "padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(11,10,18,.92);"
    "backdrop-filter:blur(10px);border-top:1px solid var(--line);transform:translateY(100%);transition:transform .25s ease}\n"
    "  .sticky-cta.show{transform:translateY(0)}"
)
html = html.replace(old_sticky, new_sticky)

html = html.replace(
    ".lead-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);"
    "border-radius:10px;margin-bottom:9px;background:var(--bg);font-size:14px}",
    ".lead-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);"
    "border-radius:10px;margin-bottom:9px;background:var(--bg);font-size:14px;cursor:pointer}\n"
    "  .lead-row.sel{border-color:var(--violet);box-shadow:0 0 0 1px rgba(139,92,246,.35)}",
)
html = html.replace("@media (max-width:880px){", "@media (max-width:880px){\n    .mock-body{min-height:auto}")

favicon = (
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' '
    "viewBox='0 0 32 32'%3E%3Crect fill='%230B0A12' width='32' height='32' rx='6'/%3E"
    "%3Ctext x='6' y='22' fill='%23A78BFA' font-family='monospace' font-size='14'%3E%E2%80%BA_%3C/text%3E%3C/svg%3E\">\n"
    '<meta name="theme-color" content="#0B0A12">'
)
html = html.replace('<link rel="canonical"', favicon + "\n<link rel=\"canonical\"")
html = html.replace("</head>", "<!-- TODO Andy: Plausible/Umami snippet -->\n</head>")
html = html.replace("pre pomalú reakciu", "kvôli pomalej reakcii")

old_gdpr = (
    "Dáta tvojej kancelárie a klientov ostávajú v EÚ a nezdieľame ich so žiadnou treťou stranou. "
    "Kedykoľvek si ich vieš vyžiadať alebo nechať vymazať."
)
new_gdpr = (
    "Dáta sú uložené v EÚ a nikdy ich nezdieľame na marketingové účely. "
    "Spracúvajú ich výhradne naši zmluvní subdodávatelia viazaní GDPR. "
    "Kedykoľvek si ich vieš vyžiadať alebo nechať vymazať."
)
html = html.replace(old_gdpr, new_gdpr)

def calendly_repl(m: re.Match) -> str:
    href = m.group(1)
    if "target=" in href:
        return href
    return f'{href} target="_blank" rel="noopener"'


html = re.sub(r'(href="https://calendly\.com[^"]+")', calendly_repl, html)

html = html.replace('<span class="badge">🔒 GDPR — dáta v EÚ</span>', '<span class="badge">GDPR · dáta v EÚ</span>')
html = html.replace('<span class="badge">🇸🇰 Vyrobené na Slovensku</span>', '<span class="badge">Vyrobené na Slovensku</span>')
html = html.replace('<span class="badge">✅ Bez kreditnej karty</span>', '<span class="badge">Bez kreditnej karty</span>')
html = html.replace('data-cta="sticky">📅 Rezervovať demo zdarma →', 'data-cta="sticky">Rezervovať demo zdarma →')

html = html.replace(
    '<p class="micro">15–20 minút · žiadne záväzky · bez kreditnej karty</p>',
    '<p class="micro">15–20 minút · žiadne záväzky · bez kreditnej karty</p>\n'
    '    <p class="micro" style="margin-top:6px">// prvý klient: ~10 h týždenne späť už v prvom mesiaci</p>',
)

skip = (
    '<a href="#main" class="skip-link">Preskočiť na obsah</a>\n'
    "<style>.skip-link{position:absolute;left:-9999px;top:auto}"
    ".skip-link:focus{left:16px;top:16px;z-index:100;background:var(--violet);color:#fff;"
    "padding:10px 16px;border-radius:8px}</style>\n<main id=\"main\">"
)
html = html.replace("<body>", "<body>\n" + skip)
html = html.replace("</footer>", "</footer>\n</main>")
html = html.replace('<span id="typer"></span>', '<span id="typer" aria-hidden="true"></span>')
html = html.replace('<span class="chk">', '<span class="chk" aria-hidden="true">')

ai_btns = (
    '<div style="display:flex;gap:8px;margin-top:12px;pointer-events:none" aria-hidden="true">'
    '<span class="btn" style="font-size:12px;padding:6px 12px;opacity:.7">✓ Schváliť</span>'
    '<span class="btn btn-ghost" style="font-size:12px;padding:6px 12px;opacity:.7">Upraviť</span></div>'
)
html = html.replace(
    "</div>\n        </div>\n      </div>\n      <div class=\"mock-foot\">",
    ai_btns + "\n        </div>\n        </div>\n      </div>\n      <div class=\"mock-foot\">",
)

for key, label in [
    ("peter", "Peter V."),
    ("jana", "Jana K."),
    ("horvath", "M. Horváth"),
    ("toth", "L. Tóthová"),
]:
    html = html.replace(
        '<div class="lead-row">',
        f'<div class="lead-row" role="button" tabindex="0" aria-label="Priorita: {label}" data-lead="{key}">',
        1,
    )

html = re.sub(r"<!-- ── CENNÍK ── -->.*?</section>\s*", "", html, flags=re.S)

portaly_faq = """<details>
        <summary>Funguje to s portálmi, ktoré používame?</summary>
        <div class="a">Dopyty z hlavných slovenských portálov a e-mailu sa zbiehajú do jedného prehľadu. Na deme ti ukážeme presne tie, ktoré používa tvoja kancelária.</div>
        <!-- TODO Andy: potvrdiť zoznam -->
      </details>
      """
html = html.replace(
    "</details>\n      <details>\n        <summary>Čo ak systém",
    "</details>\n      " + portaly_faq + "<details>\n        <summary>Čo ak systém",
    1,
)

html = html.replace(
    '<div class="calc-out" aria-live="polite">',
    '<div class="calc-out" aria-live="polite">\n'
    '        <div id="calcFast" class="calc-fast" hidden><p><strong>Reaguješ rýchlo 👍</strong> '
    "Revolis ti ušetrí čas pri inzerátoch a follow-upoch.</p>"
    '<a class="btn" href="https://calendly.com/revoliscrm/30min" data-cta="calc-fast" '
    'target="_blank" rel="noopener">Rezervovať demo →</a></div>\n        <div id="calcLoss">',
)
html = html.replace(
    "</div>\n      <div class=\"calc-note\">",
    "</div></div>\n"
    '<noscript><p class="calc-note">Príklad: 60 dopytov, 120 min odpoveď, 8 % konverzia, '
    "3 000 € provízia → odhad straty stovky € mesačne.</p></noscript>\n"
    '<div class="calc-note">',
)
html = html.replace(
    '<div class="mid"><b id="outGain">',
    '<div class="mid"><b id="outYear">ročne ≈ — €</b><span>odhad ušlých provízií</span></div>\n'
    '        <div class="mid"><b id="outDeals">≈ — obchodov mesačne</b>'
    "<span>stratené kvôli pomalej reakcii</span></div>\n"
    '        <div class="mid"><b id="outGain">',
)
html = html.replace(
    '<div class="goal-result" id="goalResult" aria-live="polite"></div>',
    '<div class="goal-result" id="goalResult" aria-live="polite"></div>\n'
    '    <a class="btn" id="goalCta" href="https://calendly.com/revoliscrm/30min" data-cta="goals" '
    'target="_blank" rel="noopener" style="display:none;margin-top:14px">Rezervovať demo na tieto ciele</a>',
)

html = html.replace("<!-- ── PAINS ── -->\n<section>", '<!-- ── PAINS ── -->\n<section id="pains">')
html = html.replace("<!-- ── AKO TO FUNGUJE ── -->\n<section>", '<!-- ── AKO TO FUNGUJE ── -->\n<section id="ako">')
html = html.replace("<!-- ── GOAL PICKER ── -->\n<section>", '<!-- ── GOAL PICKER ── -->\n<section id="goals">')
html = html.replace("<!-- ── CASE ── -->\n<section>", '<!-- ── CASE ── -->\n<section id="case">')
html = html.replace("<!-- ── FAQ ── -->\n<section>", '<!-- ── FAQ ── -->\n<section id="faq">')
html = html.replace("<!-- ── FINAL ── -->\n<section>", '<!-- ── FINAL ── -->\n<section id="final">')

produkt = re.search(r"(<!-- ── PRODUKT ── -->.*?</section>)", html, re.S).group(1)
pains = re.search(r'(<!-- ── PAINS ── -->.*?</section>)', html, re.S).group(1)
kalk = re.search(r"(<!-- ── KALKULAČKA ── -->.*?</section>)", html, re.S).group(1)
ako = re.search(r"(<!-- ── AKO TO FUNGUJE ── -->.*?</section>)", html, re.S).group(1)
case = re.search(r"(<!-- ── CASE ── -->.*?</section>)", html, re.S).group(1)
goals = re.search(r"(<!-- ── GOAL PICKER ── -->.*?</section>)", html, re.S).group(1)
faq = re.search(r"(<!-- ── FAQ ── -->.*?</section>)", html, re.S).group(1)
final = re.search(r"(<!-- ── FINAL ── -->.*?</section>)", html, re.S).group(1)

html = re.sub(r"<!-- ── PRODUKT ── -->.*<!-- ── FINAL ── -->.*?</section>\s*", "", html, flags=re.S)
insert = "\n".join([produkt, pains, kalk, ako, case, goals, faq, final]) + "\n"
html = html.replace("</div>\n</div>\n\n<footer>", "</div>\n</div>\n\n" + insert + "\n<footer>")

faqs = re.findall(r'<summary>(.*?)</summary>\s*<div class="a">(.*?)</div>', faq, re.S)
ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": q.strip(),
            "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<!--.*?-->", "", a, flags=re.S).strip()},
        }
        for q, a in faqs
    ],
}
html = html.replace("</head>", f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n</head>')

new_script = r"""
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function appendUtmToCalendly(){
    var params = new URLSearchParams(location.search);
    var utm = new URLSearchParams();
    params.forEach(function(v,k){ if(k.indexOf('utm_')===0) utm.set(k,v); });
    if(!utm.toString()) return;
    document.querySelectorAll('a[href*="calendly.com"]').forEach(function(a){
      try{ var u=new URL(a.href); utm.forEach(function(v,k){u.searchParams.set(k,v);}); a.href=u.toString(); }catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded', appendUtmToCalendly);
  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('[data-cta]') : null;
    if(!t) return;
    try{ navigator.sendBeacon('/api/t', JSON.stringify({cta:t.getAttribute('data-cta'), ts:Date.now()})); }catch(err){}
  });
  var sticky = document.querySelector('.sticky-cta');
  var heroEl = document.querySelector('.hero');
  if(sticky && heroEl && 'IntersectionObserver' in window){
    if(reduced){ sticky.classList.add('show'); }
    else {
      new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if(!en.isIntersecting) sticky.classList.add('show'); else sticky.classList.remove('show'); });
      },{threshold:0}).observe(heroEl);
    }
  }
  var nbaTexts = {
    peter: 'Zavolaj <b>Petrovi V.</b> — pýtal sa na financovanie aj obhliadku. Najvyššia šanca na obchod tento týždeň.',
    jana: 'Napíš <b>Jane K.</b> — 2-izb v Petržalke, skóre 74. Navrhni termín obhliadky tento týždeň.',
    horvath: 'Follow-up <b>M. Horváth</b> — dom Senec, záujem o financovanie. Zavolaj po 15:00.',
    toth: '<b>L. Tóthová</b> — pozemok Pezinok. Over budget a priprav krátky brief pred volaním.'
  };
  var nbaP = document.querySelector('.nba p');
  document.querySelectorAll('.lead-row[data-lead]').forEach(function(row){
    function pick(){
      document.querySelectorAll('.lead-row').forEach(function(r){r.classList.remove('sel');});
      row.classList.add('sel');
      var k = row.getAttribute('data-lead');
      if(nbaP && nbaTexts[k]) nbaP.innerHTML = nbaTexts[k];
    }
    row.addEventListener('click', pick);
    row.addEventListener('keydown', function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); pick(); }});
  });
  var first = document.querySelector('.lead-row[data-lead="peter"]'); if(first) first.classList.add('sel');
  var el = document.getElementById('typer');
  var texts = [
    "3-izbový byt, Ružinov — 78 m², svetlý, po kompletnej rekonštrukcii. Loggia s výhľadom do zelene, pivnica, výborná občianska vybavenosť…",
    "Rodinný dom, Senec — 5 izieb, pozemok 612 m², tichá ulica 10 minút od jazier. Ideálne pre rodinu, ktorá chce pokoj a rýchly dojazd…"
  ];
  if(el){ if(reduced){ el.textContent = texts[0]; } else { var t=0,i=0;(function type(){ var s=texts[t]; if(i<=s.length){el.textContent=s.slice(0,i++);setTimeout(type,28+Math.random()*34);} else {setTimeout(function(){i=0;t=(t+1)%texts.length;type();},3200);} })(); }}
  var rDop=document.getElementById('rDop'), rCas=document.getElementById('rCas'), rKon=document.getElementById('rKon'), rPro=document.getElementById('rPro');
  var calcLoss=document.getElementById('calcLoss'), calcFast=document.getElementById('calcFast');
  var calcCta=document.querySelector('[data-cta="calc"]');
  var fmt=function(n){return n.toLocaleString('sk-SK')+' €';};
  function calc(){
    var D=+rDop.value, T=+rCas.value, K=+rKon.value, P=+rPro.value;
    document.getElementById('oDop').textContent=D;
    document.getElementById('oCas').textContent=T+' min';
    document.getElementById('oKon').textContent=K+' %';
    document.getElementById('oPro').textContent=fmt(P);
    var lostShare=Math.min(Math.max((T-10)/240,0),1)*0.5;
    var lostDeals=D*(K/100)*lostShare;
    var loss=Math.round(lostDeals*P/50)*50;
    var gain=Math.round(loss*0.8/50)*50;
    if(loss<100){
      if(calcLoss) calcLoss.hidden=true;
      if(calcFast) calcFast.hidden=false;
    } else {
      if(calcLoss) calcLoss.hidden=false;
      if(calcFast) calcFast.hidden=true;
      document.getElementById('outLoss').textContent='−'+fmt(loss);
      document.getElementById('outGain').textContent='+'+fmt(gain);
      document.getElementById('outYear').textContent='ročne ≈ '+fmt(loss*12);
      document.getElementById('outDeals').textContent='≈ '+lostDeals.toFixed(1)+' obchodov mesačne';
      if(calcCta){
        var u=new URL(calcCta.href.split('?')[0]);
        u.searchParams.set('utm_content','calc_loss_'+loss);
        appendUtmToCalendly(); calcCta.href=u.toString();
      }
    }
  }
  [rDop,rCas,rKon,rPro].forEach(function(r){r.addEventListener('input',calc);}); calc();
  var goals=document.querySelectorAll('.goal');
  var res=document.getElementById('goalResult');
  var goalCta=document.getElementById('goalCta');
  function slug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
  function renderGoals(){
    var picked=[];
    goals.forEach(function(g){ var on=g.getAttribute('aria-pressed')==='true'; g.querySelector('.chk').textContent=on?'[✓]':'[ ]'; if(on) picked.push(g.dataset.goal); });
    if(picked.length){
      res.className='goal-result show';
      res.innerHTML='Vybrané: <b>'+picked.join(' · ')+'</b>. Spomeň to pri rezervácii — demo postavíme presne na tieto ciele.';
      if(goalCta){
        goalCta.style.display='inline-block';
        var u=new URL(goalCta.href.split('?')[0]);
        u.searchParams.set('utm_content','goals_'+picked.map(slug).join('_'));
        goalCta.href=u.toString();
      }
    } else { res.className='goal-result'; if(goalCta) goalCta.style.display='none'; }
  }
  goals.forEach(function(g){ g.addEventListener('click',function(){ g.setAttribute('aria-pressed', g.getAttribute('aria-pressed')==='true'?'false':'true'); renderGoals(); }); });
})();
"""

html = re.sub(r"<script>.*?</script>\s*</body>", "<script>" + new_script + "</script>\n</body>", html, flags=re.S)

out = pathlib.Path(__file__).resolve().parents[1] / "apps" / "marketing" / "public" / "revolis-demo-v3.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print("OK", out, out.stat().st_size)
