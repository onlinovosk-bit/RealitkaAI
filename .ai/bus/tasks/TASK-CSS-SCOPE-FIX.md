---
id: TASK-CSS-SCOPE-FIX
type: task
status: open
owner: cursor
created_at: 2026-09-21T00:00:00Z

scope:
  repo_paths:
    - apps/marketing/app/landing-v2.css
  forbidden_paths:
    - apps/marketing/public/**
    - apps/marketing/app/**/*.tsx
    - apps/marketing/app/globals.css
    - apps/crm/**

acceptance:
  - id: A1
    desc: "marketing build prejde"
    cmd: "npm --prefix apps/marketing run build"
    expect: exit_code == 0
  - id: A2
    desc: "diff nevysiel zo scope — jediny subor"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: "vystup == 'apps/marketing/app/landing-v2.css'"
  - id: A3
    desc: "ziadny selektor uz nekonci na holom .landing-v2 ani na .landing-v2 + pseudo/atribut"
    cmd: >-
      python3 -c "import re,io,sys;L=io.open('apps/marketing/app/landing-v2.css',encoding='utf-8').read().split('\n');
      bad=[(i,l.split('{')[0].strip()) for i,l in enumerate(L,1) if '{' in l and l.split('{')[0].strip().startswith('.landing-v2')
      and (lambda r: r=='' or re.match(r'^\s+(::|:|\[)',r) or re.match(r'^\s\s+',r))(l.split('{')[0].strip()[len('.landing-v2'):])];
      bad=[b for b in bad if b[0] not in (2,189)];
      print(bad); sys.exit(1 if bad else 0)"
    expect: exit_code == 0
  - id: A4
    desc: "kazdy opraveny selektor sa da odvodit z <style> v revolis-demo-v3.html"
    cmd: "git diff origin/main...HEAD -- apps/marketing/app/landing-v2.css"
    expect: "kazdy + riadok zodpoveda riadku mapovacej tabulky nizsie"
  - id: A5
    desc: "FAQ +/- toggle a layout na preview deployi"
    cmd: "manualny/Playwright smoke na Vercel preview URL"
    expect: "summary ma ::after '+', po otvoreni '-'; ziadny iny element nema ::after '+'"

budget:
  max_iterations: 4
  max_cost_usd: 2
  max_runtime_minutes: 20

risk: medium

evidence:
  commands: []
  files:
    - apps/marketing/app/landing-v2.css
    - apps/marketing/public/revolis-demo-v3.html

verdict:
  result: null
  reason: null
  checked_at: null
  ledger_run_id: null
---

# TASK-CSS-SCOPE-FIX — obnoviť selector scope v `landing-v2.css`

`apps/marketing/app/landing-v2.css` vznikol prefixovaním `.landing-v2 ` na `<style>`
blok z `apps/marketing/public/revolis-demo-v3.html`. Ten scoping **zhltol každý holý
element-selektor** (`html`, `body`, `*`, `a`, `header`, `section`, `h2`, `details`,
`summary`, `footer`, `::selection`). Výsledok: 19 pravidiel, ktoré patrili rôznym
elementom, mieri na koreňový `<div className="landing-v2">`
(`apps/marketing/app/page.tsx:6` — marketingová homepage `/`).

Majú rovnakú špecificitu `(0,1,0)`, takže sa zlejú a per-property vyhrá posledné.
Z toho na kontajneri prežijú okrem iného `display:flex`, `justify-content:space-between`,
`align-items:center`, `gap:14px`, `cursor:pointer`, `border`, `border-radius`,
`overflow:hidden`. Reset `*{margin:0;padding:0}` sa neaplikuje na potomkov, iba na
kontajner.

**`.landing-v2 ::after` (r. 153) s `content:"+"` je iba najviditeľnejší z 19 symptómov.**
Nerieš ho samostatne.

## Najprv som hľadal

- `apps/marketing/public/revolis-demo-v3.html:163-169` — originál, sedí riadok po riadku
  (`demo.html` má rovnaký blok). **Toto je zdroj pravdy.**
- `git log -L 153,153` → súbor pribudol ako celok v `779e184` (merge #528), predošlá
  verzia neexistuje.
- `apps/marketing/app/globals.css:21` — `html { scroll-behavior:smooth; }` už existuje
  globálne (dôležité pre rozhodnutie D2 nižšie).
- `landing-v2.css:189` — nesie telo pôvodného `body` pravidla + `min-height:100vh`
  (dôležité pre D3).

## Mechanické premenovanie (16 riadkov)

| r. | teraz | má byť |
|---|---|---|
| 13 | `.landing-v2 [id]` | `.landing-v2 section[id]` |
| 15 | `.landing-v2` | `.landing-v2 ::selection` |
| 16 | `.landing-v2` | `.landing-v2 a` |
| 21 | `.landing-v2` | `.landing-v2 header` |
| 42 | `.landing-v2` | `.landing-v2 section` |
| 44 | `.landing-v2` | `.landing-v2 h2` |
| 150 | `.landing-v2` | `.landing-v2 details` |
| 151 | `.landing-v2` | `.landing-v2 summary` |
| 152 | `.landing-v2 ::-webkit-details-marker` | `.landing-v2 summary::-webkit-details-marker` |
| 153 | `.landing-v2 ::after` | `.landing-v2 summary::after` |
| 154 | `.landing-v2 [open] summary::after` | `.landing-v2 details[open] summary::after` |
| 155 | `.landing-v2 :focus-visible` | `.landing-v2 summary:focus-visible` |
| 156 | `.landing-v2  .a` | `.landing-v2 details .a` |
| 160 | `.landing-v2` | `.landing-v2 footer` |
| 161 | `.landing-v2  .wrap` | `.landing-v2 footer .wrap` |
| 162 | `.landing-v2  a` | `.landing-v2 footer a` |

Riadky 2 a 189 sú legitímne pravidlá pre samotný koreň — **nedotýkať sa ich**.

## Tri riadky, ktoré NIE sú mechanické

Doslovný prepis by vyrobil mŕtve pravidlá — vnútri `<div>` neexistuje `html` ani `body`.

### D1 — r. 11, originál `*{box-sizing:border-box;margin:0;padding:0}`

`.landing-v2 *` je platné, ale reset prestane platiť na samotný kontajner.
**Odporúčanie:** `.landing-v2, .landing-v2 *`.

### D2 — r. 12, originál `html{scroll-behavior:smooth}`

`.landing-v2 html` nematchuje nič. `globals.css:21` už to isté pravidlo má globálne
a `layout.tsx:3` ho importuje.
**Odporúčanie:** riadok 12 zmazať ako redundantný. (Pozn.: `landing-v2.css:181`
`html{scroll-behavior:auto}` je vnútri `prefers-reduced-motion` a je správne — nechať.)

### D3 — r. 14, originál `body{background;color;font-family;font-size;line-height;-webkit-font-smoothing}`

`.landing-v2 body` nematchuje nič. Riadok 189 nesie **identické** telo plus
`min-height:100vh` — overené porovnaním deklarácií.
**Odporúčanie:** riadok 14 zmazať ako duplikát 189.

Ak sa vykonávateľ rozhodne inak než D1–D3, musí to v PR zdôvodniť. Bez zdôvodnenia
platia odporúčania.

## STOP podmienky

- žiadna zmena `revolis-demo-v3.html` ani `demo.html`
- žiadna zmena React/TS
- žiadna zmena `globals.css`
- žiadne nové CSS pravidlá, žiadna zmena vizuálneho dizajnu, žiadny iný cleanup
- legal 404 / entity blocker / refund — mimo scope, samostatné nálezy
- commit + PR až po A1–A4

## Report

`CSS-SCOPE-FIX PASS/FAIL` + presný diff 19 selektorov + rozhodnutie k D1–D3.
