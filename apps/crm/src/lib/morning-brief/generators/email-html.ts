// ================================================================
// Revolis.AI — Morning Brief Email Renderer
// Builds the full HTML email with tracking pixel
// ================================================================
import type { MorningBriefData } from '@/types/morning-brief'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export function renderBriefEmail(brief: MorningBriefData): string {
  const { topLead, overnight, action, stats, aiText, variant } = brief

  const urgencyColor = action.urgency === 'high'
    ? '#1D9E75' : action.urgency === 'medium' ? '#EF9F27' : '#378ADD'

  const trackingPixel =
    `${BASE_URL}/api/morning-brief/track/open?id=${brief.briefId}`
  const clickUrl = (leadId: string) =>
    `${BASE_URL}/api/morning-brief/track/click?brief=${brief.briefId}&lead=${leadId}`

  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Revolis.AI · Ranný brief</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
       background:#F8FAFC;color:#0F172A;-webkit-text-size-adjust:100%;}
  .wrap{max-width:560px;margin:0 auto;padding:20px 16px;}
  .card{background:#fff;border-radius:12px;overflow:hidden;
        border:1px solid #E2E8F0;}
  .hdr{background:#0F172A;padding:20px 24px;display:flex;
       align-items:center;justify-content:space-between;}
  .hdr-logo{color:#22D3EE;font-size:15px;font-weight:600;letter-spacing:.02em;}
  .hdr-date{color:#64748B;font-size:12px;}
  .body{padding:24px;}
  .label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
         margin-bottom:6px;}
  .ai-text{font-size:16px;line-height:1.7;color:#0F172A;margin-bottom:20px;}
  .lead-box{border-radius:8px;padding:16px;margin-bottom:16px;}
  .lead-name{font-size:20px;font-weight:600;margin-bottom:2px;}
  .lead-sub{font-size:13px;opacity:.85;}
  .score-ring{display:inline-flex;align-items:center;justify-content:center;
              width:48px;height:48px;border-radius:50%;font-size:18px;
              font-weight:600;flex-shrink:0;}
  .row{display:flex;align-items:center;gap:14px;}
  .overnight{background:#F8FAFC;border-radius:8px;padding:14px;margin-bottom:16px;}
  .overnight-item{display:flex;align-items:flex-start;gap:10px;
                  padding:7px 0;border-bottom:1px solid #E2E8F0;}
  .overnight-item:last-child{border-bottom:none;padding-bottom:0;}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px;}
  .overnight-text{font-size:13px;line-height:1.5;color:#334155;}
  .action-box{border-radius:8px;padding:16px;margin-bottom:20px;}
  .action-verb{font-size:13px;font-weight:600;letter-spacing:.05em;
               text-transform:uppercase;margin-bottom:6px;}
  .action-text{font-size:15px;line-height:1.6;color:#0F172A;}
  .cta{display:block;text-align:center;border-radius:8px;
       padding:14px 24px;font-size:15px;font-weight:600;
       text-decoration:none;color:#fff!important;margin-bottom:8px;}
  .stats-row{display:flex;gap:8px;margin-bottom:20px;}
  .stat{flex:1;background:#F8FAFC;border-radius:8px;padding:10px;text-align:center;}
  .stat-n{font-size:22px;font-weight:600;display:block;}
  .stat-l{font-size:11px;color:#64748B;display:block;margin-top:2px;}
  .ftr{padding:16px 24px;border-top:1px solid #E2E8F0;text-align:center;}
  .ftr a{color:#64748B;font-size:12px;text-decoration:none;}
  @media(prefers-color-scheme:dark){
    body{background:#0F172A;}
    .card{background:#1E293B;border-color:#334155;}
    .ai-text{color:#F1F5F9;}
    .overnight{background:#0F172A;}
    .overnight-text{color:#CBD5E1;}
    .action-text{color:#F1F5F9;}
    .stat{background:#0F172A;}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">

    <!-- Header -->
    <div class="hdr">
      <span class="hdr-logo">Revolis.AI</span>
      <span class="hdr-date">
        ${new Date().toLocaleDateString('sk-SK', { weekday:'long', day:'numeric', month:'long' })}
      </span>
    </div>

    <div class="body">

      <!-- AI-generated brief text -->
      <p class="label" style="color:${urgencyColor};">Ranný brief</p>
      <p class="ai-text">${aiText}</p>

      <!-- Top lead card -->
      <div class="lead-box" style="background:${urgencyColor}18;border-left:3px solid ${urgencyColor};">
        <div class="row">
          <div style="flex:1;">
            <p class="label" style="color:${urgencyColor};">Najhorúcejší lead dnes</p>
            <p class="lead-name">${topLead.name}</p>
            <p class="lead-sub" style="color:${urgencyColor}cc;">
              ${topLead.reason}
              ${topLead.property ? ` · ${topLead.property}` : ''}
            </p>
          </div>
          <div class="score-ring"
               style="background:${urgencyColor}28;color:${urgencyColor};">
            ${topLead.score}
          </div>
        </div>
      </div>

      <!-- Overnight digest -->
      ${buildOvernightSection(overnight, brief.briefId)}

      <!-- Stats row -->
      <div class="stats-row">
        ${buildStatCard(stats.hotLeads, 'hot leadov', '#1D9E75')}
        ${buildStatCard(stats.newInquiries, 'nových dopytov', '#378ADD')}
        ${buildStatCard(stats.scoreIncreases, 'rastúcich BRI', '#EF9F27')}
        ${brief.overnight.lvChanges.length > 0
          ? buildStatCard(brief.overnight.lvChanges.length, 'zmien LV', '#534AB7')
          : buildStatCard(stats.activeLeads, 'aktívnych', '#888780')}
      </div>

      <!-- Action box -->
      <div class="action-box"
           style="background:${urgencyColor}10;border:1px solid ${urgencyColor}30;">
        <p class="action-verb" style="color:${urgencyColor};">${action.verb} teraz</p>
        <p class="action-text">${action.context}</p>
      </div>

      <!-- CTA -->
      <a href="${clickUrl(topLead.id)}" class="cta"
         style="background:${urgencyColor};">
        Otvoriť ${topLead.name} v Revolis.AI →
      </a>

      ${topLead.phone ? `
      <a href="tel:${topLead.phone}" class="cta"
         style="background:#0F172A;font-size:13px;padding:10px;">
        Zavolať: ${topLead.phone}
      </a>` : ''}

    </div><!-- /body -->

    <!-- Footer -->
    <div class="ftr">
      <a href="${BASE_URL}/settings/notifications">Upraviť nastavenia</a>
      &nbsp;·&nbsp;
      <a href="${BASE_URL}/api/notifications/unsubscribe?profile=${brief.profileId}">Odhlásiť</a>
      &nbsp;·&nbsp;
      <a href="${BASE_URL}/leads">Všetky leady</a>
    </div>

  </div><!-- /card -->
</div><!-- /wrap -->

<!-- Tracking pixel -->
<img src="${trackingPixel}" width="1" height="1"
     style="display:block;width:1px;height:1px;opacity:0;" alt="" />
</body>
</html>`
}

function buildOvernightSection(
  overnight: MorningBriefData['overnight'],
  briefId:   string
): string {
  const items: string[] = []

  overnight.replies.forEach(r => {
    items.push(`
      <div class="overnight-item">
        <div class="dot" style="background:#1D9E75;"></div>
        <p class="overnight-text">
          <strong>${r.leadName}</strong> odpovedal na vašu správu
          o ${r.repliedAt.slice(11, 16)}
        </p>
      </div>`)
  })

  overnight.lvChanges.forEach(lv => {
    items.push(`
      <div class="overnight-item">
        <div class="dot" style="background:#534AB7;"></div>
        <p class="overnight-text">
          <strong>LV zmena:</strong> ${lv.address}
          ${lv.leadName ? ` · súvisí s leadom ${lv.leadName}` : ''}
        </p>
      </div>`)
  })

  overnight.arbitrage.forEach(a => {
    items.push(`
      <div class="overnight-item">
        <div class="dot" style="background:#EF9F27;"></div>
        <p class="overnight-text">
          <strong>Arbitráž:</strong> ${a.address} ·
          rozdiel ${a.delta.toLocaleString('sk')} € (${a.deltaPct}%)
          medzi portálmi
        </p>
      </div>`)
  })

  overnight.priceDrops.forEach(d => {
    items.push(`
      <div class="overnight-item">
        <div class="dot" style="background:#E24B4A;"></div>
        <p class="overnight-text">
          <strong>Pokles ceny:</strong> ${d.address} ·
          −${d.dropPct}%
          ${d.dropCount > 1 ? ` (${d.dropCount}. pokles celkovo)` : ''}
        </p>
      </div>`)
  })

  if (items.length === 0) return ''

  return `
    <div class="overnight">
      <p class="label" style="color:#64748B;margin-bottom:4px;">Cez noc</p>
      ${items.join('')}
    </div>`
}

function buildStatCard(value: number, label: string, color: string): string {
  return `
    <div class="stat">
      <span class="stat-n" style="color:${color};">${value}</span>
      <span class="stat-l">${label}</span>
    </div>`
}
