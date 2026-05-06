import { PoolClient } from 'pg'

export type OutboxEventType =
  | 'ListingCreated'
  | 'ListingUpdated'
  | 'PriceChanged'
  | 'StatusChanged'
  | 'ListingRemoved'

export interface OutboxEvent {
  organizationId: string
  eventType: OutboxEventType
  aggregateId: string   // listing.id
  payload: Record<string, unknown>
}

export async function insertOutboxEvents(
  client: PoolClient,
  events: OutboxEvent[]
): Promise<void> {
  if (events.length === 0) return

  const values = events
    .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
    .join(', ')

  const params = events.flatMap((e) => [
    e.organizationId,
    e.eventType,
    e.aggregateId,
    JSON.stringify(e.payload),
  ])

  await client.query(
    `INSERT INTO outbox (organization_id, event_type, aggregate_id, payload) VALUES ${values}`,
    params
  )
}

// Outbox publisher — stub until NATS is provisioned.
// Polls unpublished rows and marks them published after delivery.
// Replace the publishToNats() call with the real NATS client in Phase 4.
export async function publishPendingOutbox(
  queryFn: (sql: string, params?: unknown[]) => Promise<Array<Record<string, unknown>>>
): Promise<number> {
  const pending = await queryFn(
    `SELECT id, event_type, aggregate_id, payload, organization_id
     FROM outbox
     WHERE published_at IS NULL
     ORDER BY created_at
     LIMIT 100`
  )

  if (pending.length === 0) return 0

  let published = 0
  for (const row of pending) {
    try {
      await publishToNats(row as Record<string, unknown>)
      await queryFn(
        `UPDATE outbox SET published_at = NOW() WHERE id = $1`,
        [row['id']]
      )
      published++
    } catch (err) {
      console.error('[outbox] publish failed for', row['id'], (err as Error).message)
    }
  }

  console.log(`[outbox] published ${published}/${pending.length} events`)
  return published
}

async function publishToNats(_event: Record<string, unknown>): Promise<void> {
  const natsUrl = process.env.NATS_URL
  if (!natsUrl) {
    // Dev: log to console instead of dropping
    console.log('[outbox:stub] would publish:', _event['event_type'], _event['aggregate_id'])
    return
  }
  // TODO Phase 4: import { connect } from 'nats'; publish to natsUrl
  throw new Error('NATS publisher not yet implemented. Set NATS_URL when ready.')
}
