import 'dotenv/config'
import express from 'express'
import { RealviaAdapter } from './vendors/realvia/adapter'
import { createCircuitBreaker, runIngestion } from './ingestion/runner'
import { publishPendingOutbox } from './ingestion/outbox'
import { query } from './db'

const PORT    = parseInt(process.env.PORT ?? '4100', 10)
const ORG_ID  = process.env.DEFAULT_ORGANIZATION_ID ?? '00000000-0000-0000-0000-000000000001'
const VENDOR  = 'realvia'

const adapter = new RealviaAdapter()
const circuit = createCircuitBreaker()

// ─── Adaptive cadence ────────────────────────────────────────────────────────
function nextIntervalMs(): number {
  const defaultCadence  = parseInt(process.env.CADENCE_DEFAULT  ?? '15', 10)
  const businessCadence = parseInt(process.env.CADENCE_BUSINESS ?? '5',  10)
  const overnightCadence= parseInt(process.env.CADENCE_OVERNIGHT ?? '60', 10)
  const startHour = parseInt(process.env.BUSINESS_HOURS_START ?? '9',  10)
  const endHour   = parseInt(process.env.BUSINESS_HOURS_END   ?? '18', 10)

  // Use Bratislava local hour for cadence decisions
  const hourBratislava = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Bratislava', hour: 'numeric', hour12: false
  })
  const hour = parseInt(hourBratislava, 10)

  if (hour >= endHour || hour < 7) return overnightCadence * 60_000
  if (hour >= startHour && hour < endHour) return businessCadence * 60_000
  return defaultCadence * 60_000
}

let running = false
let timer: ReturnType<typeof setTimeout> | null = null

async function tick(): Promise<void> {
  if (running) return
  running = true
  try {
    await runIngestion(adapter, circuit, ORG_ID, VENDOR)
    await publishPendingOutbox(query)
  } finally {
    running = false
    schedule()
  }
}

function schedule(): void {
  const delay = nextIntervalMs()
  console.log(`[scheduler] next ingestion in ${delay / 60_000} min`)
  timer = setTimeout(() => void tick(), delay)
}

// ─── HTTP health + status ────────────────────────────────────────────────────
const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'realvia-ingestion', ts: new Date().toISOString() })
})

app.get('/status', (_req, res) => {
  const cb = circuit.getStatus()
  res.json({ ok: true, circuit: cb, running })
})

// Manual trigger (useful in Phase 1 testing)
app.post('/run', async (_req, res) => {
  if (running) {
    res.status(409).json({ ok: false, message: 'Run already in progress' })
    return
  }
  res.json({ ok: true, message: 'Ingestion triggered' })
  void tick()
})

app.get('/runs', async (_req, res) => {
  const runs = await query(
    `SELECT id, status, started_at, ended_at, listings_seen, listings_created,
            listings_updated, listings_withdrawn, parse_failures, schema_drifts, error_message
     FROM ingestion_runs
     WHERE organization_id = $1
     ORDER BY started_at DESC LIMIT 20`,
    [ORG_ID]
  )
  res.json({ ok: true, runs })
})

// Only start the scheduler when --once flag is NOT present
const runOnce = process.argv.includes('--once')

app.listen(PORT, () => {
  console.log(`[realvia-ingestion] listening on :${PORT}`)

  if (runOnce) {
    console.log('[scheduler] --once mode: single run, then exit')
    void tick().then(() => process.exit(0))
  } else {
    schedule()
    console.log('[scheduler] adaptive cadence started')
  }
})

// Graceful shutdown
const shutdown = (): void => {
  console.log('[app] shutting down...')
  if (timer) clearTimeout(timer)
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
