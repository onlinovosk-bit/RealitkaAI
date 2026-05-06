import 'dotenv/config'
import express from 'express'
import { apiKeyAuth, hubspotWebhookAuth } from './middleware/auth'
import { requestLogger } from './middleware/requestLogger'
import eventsRouter from './routes/events'
import demosRouter from './routes/demos'
import hubspotRouter from './routes/hubspot'
import kpisRouter from './routes/kpis'
import { startSequenceWorker } from './workers/sequenceWorker'

const app = express()
const PORT = parseInt(process.env.PORT ?? '4000', 10)

app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)

// Health — no auth
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'revenue-intelligence', ts: new Date().toISOString() })
})

// HubSpot webhook — uses its own signature-based auth
app.use('/api/hubspot', hubspotWebhookAuth, hubspotRouter)

// All other routes — API key auth
app.use('/api/events', apiKeyAuth, eventsRouter)
app.use('/api/demos',  apiKeyAuth, demosRouter)
app.use('/api/kpis',   apiKeyAuth, kpisRouter)

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found', code: 404 })
})

// Unhandled errors
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message)
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error', code: 500 })
})

const server = app.listen(PORT, () => {
  console.log(`[revenue-intelligence] listening on :${PORT}`)
})

// Start BullMQ worker in-process (separate deployment possible via WORKER_ONLY=true)
const worker = startSequenceWorker()

// Graceful shutdown
const shutdown = async (): Promise<void> => {
  console.log('[app] shutting down...')
  server.close()
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT',  () => void shutdown())

export default app
