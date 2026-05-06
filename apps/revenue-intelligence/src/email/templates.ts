interface TemplateVars {
  name?: string
  email: string
  score?: number
  day?: number
}

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a}
  .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:#0f0f0f;padding:28px 40px;color:#fff}
  .header h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.3px}
  .header p{margin:4px 0 0;font-size:13px;color:#888}
  .body{padding:36px 40px}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#333}
  .cta{display:inline-block;background:#0f0f0f;color:#fff;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;margin:8px 0 24px}
  .divider{border:none;border-top:1px solid #eee;margin:28px 0}
  .footer{padding:20px 40px 28px;font-size:12px;color:#aaa;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Revolis.AI</h1>
    <p>Revenue Intelligence</p>
  </div>
  <div class="body">${content}</div>
  <hr class="divider">
  <div class="footer">
    Revolis.AI · revolis.ai<br>
    Ak si neželáš dostávať tieto správy, <a href="{{unsubscribe}}">odhlásiť sa</a>.
  </div>
</div>
</body>
</html>`
}

export function trialStartTemplate(vars: TemplateVars): { subject: string; html: string } {
  const firstName = vars.name?.split(' ')[0] ?? 'ahoj'
  return {
    subject: `${firstName}, tvoj trialový prístup čaká`,
    html: base(`
      <p>Toto je správa pre ${firstName}.</p>
      <p>Dnes si videl, čo Revolis.AI robí s leadmi v RK. Na základe toho čo si nám povedal —
      vidíme jasnú príležitosť: <strong>zastaviť únik dealov, ktoré ti dnes prepadávajú cez prsty.</strong></p>
      <p>Zriadili sme pre teba trialový prístup. Stačí si ho aktivovať — celá nastavenia zaberú do 10 minút.</p>
      <a class="cta" href="https://app.revolis.ai/onboarding">Aktivovať trial →</a>
      <p style="font-size:13px;color:#666">Máš otázku? Odpovedz priamo na tento email alebo sa ozvi.</p>
    `),
  }
}

export function followup24hTemplate(vars: TemplateVars): { subject: string; html: string } {
  const firstName = vars.name?.split(' ')[0] ?? 'ahoj'
  return {
    subject: `${firstName}, čo hovorí tvoj vedúci maklér?`,
    html: base(`
      <p>Včera sme sa rozprávali o leadoch, ktoré ti unikajú.</p>
      <p>Jedna vec, ktorú väčšina RK prehliadne: makléri vedia ktoré leady sú horúce — ale nemajú systém
      ako to ukázať vedeniu v reálnom čase. Revolis.AI to rieši automaticky.</p>
      <p>Chcel by som ti ukázať konkrétne čísla pre RK tvojej veľkosti — na 15 minút.</p>
      <a class="cta" href="https://revolis.ai/demo">Rezervovať 15-minútový call →</a>
    `),
  }
}

export function retargetingTemplate(vars: TemplateVars): { subject: string; html: string } {
  const firstName = vars.name?.split(' ')[0] ?? 'ahoj'
  const day = vars.day ?? 2
  const subjects: Record<number, string> = {
    2:  `${firstName}, jeden maklér z Prešova zatvoril o 23 % viac dealov`,
    5:  `Čo sa stane s leadmi, ktoré tvoji makléri zabudnú sledovať?`,
    10: `${firstName}, ponuka stále platí`,
  }
  const bodies: Record<number, string> = {
    2:  `<p>Reality Smolko z Prešova začali používať Revolis.AI pred 3 mesiacmi.
          Výsledok: <strong>23 % viac uzavretých dealov</strong> bez nových maklérov.</p>
          <p>Nie je to mágia — je to systém, ktorý sleduje každý lead a povie maklérom kedy a ako reagovať.</p>
          <a class="cta" href="https://revolis.ai/demo">Pozrieť ako to funguje →</a>`,
    5:  `<p>Každý týždeň stratí priemerná RK 2–4 leady, ktoré skončia u konkurencie.
          Nie preto, že makléri sú zlí — ale preto, že systém ich neupozorní včas.</p>
          <p>Revolis.AI to rieši: <strong>BRI skóre</strong> ukáže každý ráno TOP 3 leady, ktoré potrebujú kontakt dnes.</p>
          <a class="cta" href="https://revolis.ai/demo">Pozrieť Morning Brief →</a>`,
    10: `<p>Cháp, že načasovanie nie je vždy správne.</p>
          <p>Ak sa situácia zmení — ak začneš riešiť rast RK alebo straty leadov — viem kde ma nájsť.</p>
          <p>Ponuka trialového prístupu platí ešte 2 týždne.</p>
          <a class="cta" href="https://revolis.ai/demo">Pozrieť demo →</a>`,
  }
  return {
    subject: subjects[day] ?? subjects[10],
    html: base(bodies[day] ?? bodies[10]),
  }
}
