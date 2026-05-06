import crypto from 'crypto'
import { query, withTransaction } from '../db'
import { VendorAdapter, NotImplementedError } from '../vendors/realvia/adapter'
import { diffAndPersist } from './diff'
import { insertOutboxEvents } from './outbox'
import { createObjectStore, buildStorageKey } from '../storage/objectStore'
import { withRetry } from '../reliability/retry'
import { CircuitBreaker } from '../reliability/circuitBreaker'

interface RunResult {
  runId: string
  status: 'success' | 'failed' | 'partial'
  listingsSeen: number
  listingsCreated: number
  listingsUpdated: number
  listingsWithdrawn: number
  parseFailures: number
  schemaDrifts: number
  durationMs: number
}

const objectStore = createObjectStore()

export function createCircuitBreaker(onOpen?: (n: number) => void): CircuitBreaker {
  return new CircuitBreaker({
    onOpen: (n) => {
      console.error(`[circuit] OPEN — ${n} consecutive ingestion failures. Manual intervention required.`)
      onOpen?.(n)
    },
    onClose: () => console.log('[circuit] CLOSED — ingestion recovered'),
  })
}

export async function runIngestion(
  adapter: VendorAdapter,
  circuit: CircuitBreaker,
  organizationId: string,
  vendor = 'realvia'
): Promise<RunResult> {
  const startMs = Date.now()
  const runId = crypto.randomUUID()

  // Insert run record
  await query(
    `INSERT INTO ingestion_runs (id, organization_id, vendor, status)
     VALUES ($1, $2, $3, 'running')`,
    [runId, organizationId, vendor]
  )

  const finalize = async (
    status: RunResult['status'],
    counts: Partial<Omit<RunResult, 'runId' | 'status' | 'durationMs'>>,
    errorMessage?: string
  ): Promise<RunResult> => {
    const durationMs = Date.now() - startMs
    await query(
      `UPDATE ingestion_runs SET
         status = $1, ended_at = NOW(),
         listings_seen = $2, listings_created = $3, listings_updated = $4,
         listings_withdrawn = $5, parse_failures = $6, schema_drifts = $7,
         error_message = $8
       WHERE id = $9`,
      [
        status,
        counts.listingsSeen ?? 0, counts.listingsCreated ?? 0,
        counts.listingsUpdated ?? 0, counts.listingsWithdrawn ?? 0,
        counts.parseFailures ?? 0, counts.schemaDrifts ?? 0,
        errorMessage ?? null, runId,
      ]
    )
    console.log(`[runner] run ${runId} ${status} in ${durationMs}ms`, counts)
    return { runId, status, durationMs, ...counts } as RunResult
  }

  try {
    // Fetch from vendor (with retry + circuit breaker)
    const fetchResult = await circuit.execute(() =>
      withRetry(() => adapter.fetchListings(organizationId), {
        maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS ?? '5', 10),
        onRetry: (attempt, err) =>
          console.warn(`[runner] fetch retry ${attempt}: ${err.message}`),
      })
    )

    // Persist raw snapshot to object store
    const storageKey = buildStorageKey(vendor, organizationId, runId)
    const stored = await objectStore.put(storageKey, fetchResult.raw).catch((err) => {
      console.error('[runner] raw snapshot storage failed (non-fatal):', (err as Error).message)
      return null
    })

    if (stored) {
      await query(
        `INSERT INTO raw_snapshots (organization_id, run_id, storage_key, size_bytes, listing_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, runId, stored.key, stored.sizeBytes, fetchResult.listings.length]
      )
    }

    // Log parse failures to DLQ (non-blocking)
    for (const failure of fetchResult.parseFailures) {
      await query(
        `INSERT INTO parse_dlq (organization_id, run_id, vendor_listing_id, raw_payload, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, runId, failure.vendorId, JSON.stringify(failure.raw), failure.error]
      ).catch(() => {})
    }

    if (fetchResult.schemaDrifts > 0) {
      console.warn(`[runner] schema_drift detected: ${fetchResult.schemaDrifts} unknown fields in this run`)
    }

    // Diff + persist in a single transaction
    const diff = await withTransaction(async (client) => {
      const diffResult = await diffAndPersist(
        client, organizationId, fetchResult.listings, vendor
      )
      await insertOutboxEvents(client, diffResult.events)
      return diffResult
    })

    return finalize('success', {
      listingsSeen:     fetchResult.listings.length,
      listingsCreated:  diff.created,
      listingsUpdated:  diff.updated,
      listingsWithdrawn: diff.withdrawn,
      parseFailures:    fetchResult.parseFailures.length,
      schemaDrifts:     fetchResult.schemaDrifts,
    })
  } catch (err) {
    const msg = (err as Error).message
    const isNotImplemented = err instanceof NotImplementedError

    if (!isNotImplemented) {
      console.error('[runner] ingestion failed:', msg)
    } else {
      console.warn('[runner] adapter not yet implemented (Phase 0 pending):', msg)
    }

    return finalize('failed', {}, msg)
  }
}
