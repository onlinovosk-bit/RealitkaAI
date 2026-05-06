import { WebClient } from '@slack/web-api'

let client: WebClient | null = null

function getClient(): WebClient | null {
  if (!process.env.SLACK_BOT_TOKEN) return null
  if (!client) client = new WebClient(process.env.SLACK_BOT_TOKEN)
  return client
}

const channel = () => process.env.SLACK_ALERT_CHANNEL ?? '#sales-alerts'
const dashUrl  = () => process.env.DASHBOARD_URL ?? 'https://dashboard.revolis.ai'

export async function notifyHighScore(params: {
  email: string
  name?: string
  company?: string
  score: number
  demoId: string
  hubspotDealId?: string | null
}): Promise<void> {
  const slack = getClient()
  if (!slack) return

  const displayName = params.name ?? params.email
  const company = params.company ? ` — ${params.company}` : ''

  await slack.chat.postMessage({
    channel: channel(),
    text: `HIGH SCORE DEMO: ${displayName}${company} (${params.score}/100)`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*HIGH SCORE DEMO*\n*${displayName}*${company}\nSkóre: *${params.score}/100*\n\nTriál email odoslaný. Ak nereaguje do 4h → zavolajte priamo.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Dashboard' },
            url: `${dashUrl()}/demos/${params.demoId}`,
            style: 'primary',
          },
          ...(params.hubspotDealId
            ? [
                {
                  type: 'button' as const,
                  text: { type: 'plain_text' as const, text: 'HubSpot' },
                  url: `https://app.hubspot.com/contacts/deals/${params.hubspotDealId}`,
                },
              ]
            : []),
        ],
      },
    ],
  }).catch((err: Error) => console.error('[slack] notifyHighScore failed', err.message))
}

export async function notifyNoTrialAfter4h(params: {
  email: string
  name?: string
  score: number
  demoId: string
}): Promise<void> {
  const slack = getClient()
  if (!slack) return

  const displayName = params.name ?? params.email

  await slack.chat.postMessage({
    channel: channel(),
    text: `4h uplynuli — ${displayName} ešte nespustil trial`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Upozornenie: 4h bez trialového prístupu*\n*${displayName}* (skóre ${params.score}/100)\n\nEmail bol odoslaný 4h späť. Zatiaľ žiadna aktivácia.\n*Odporúčanie: priamy telefonát dnes.*`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            style: 'danger',
            text: { type: 'plain_text', text: 'Zavolať teraz' },
            url: `${dashUrl()}/demos/${params.demoId}`,
          },
        ],
      },
    ],
  }).catch((err: Error) => console.error('[slack] notifyNoTrialAfter4h failed', err.message))
}

export async function sendWeeklyReport(report: {
  demoToTrial: number
  trialToPaid: number
  revenuPerDemo: number
  avgDaysToClose: number
  recommendations: string
}): Promise<void> {
  const slack = getClient()
  if (!slack) return

  await slack.chat.postMessage({
    channel: channel(),
    text: 'Týždenný revenue report',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '*Týždenný revenue report*',
            `• Demo → Trial: *${(report.demoToTrial * 100).toFixed(1)}%*`,
            `• Trial → Paid: *${(report.trialToPaid * 100).toFixed(1)}%*`,
            `• Revenue/Demo: *€${report.revenuPerDemo.toFixed(0)}*`,
            `• Čas k platbe: *${report.avgDaysToClose.toFixed(1)} dní*`,
          ].join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Agent odporúčania:*\n${report.recommendations}`,
        },
      },
    ],
  }).catch((err: Error) => console.error('[slack] sendWeeklyReport failed', err.message))
}
