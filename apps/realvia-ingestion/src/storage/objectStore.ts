import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)

export interface StorageKey {
  key: string        // e.g. realvia/smolko/2026/05/05/14/abc123.json.gz
  sizeBytes: number
}

// Interface allows swapping to S3/R2 when Phase 0 credentials arrive.
export interface ObjectStore {
  put(key: string, content: string): Promise<StorageKey>
}

// ─── Local filesystem store (dev / pre-Phase 0) ───────────────────────────────
class LocalObjectStore implements ObjectStore {
  private readonly baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  async put(key: string, content: string): Promise<StorageKey> {
    const filePath = path.join(this.baseDir, key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    const compressed = await gzip(Buffer.from(content, 'utf8'))
    await fs.writeFile(filePath + '.gz', compressed)

    return { key: key + '.gz', sizeBytes: compressed.byteLength }
  }
}

// ─── S3-compatible store stub (wire in Phase 0 once AWS/R2 creds arrive) ─────
class S3ObjectStore implements ObjectStore {
  async put(_key: string, _content: string): Promise<StorageKey> {
    throw new Error(
      'S3ObjectStore not implemented. ' +
      'Add @aws-sdk/client-s3 and configure AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.'
    )
  }
}

export function buildStorageKey(
  vendor: string,
  orgSlug: string,
  runId: string
): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(now.getUTCDate()).padStart(2, '0')
  const hh   = String(now.getUTCHours()).padStart(2, '0')
  return `${vendor}/${orgSlug}/${yyyy}/${mm}/${dd}/${hh}/${runId}.json`
}

export function createObjectStore(): ObjectStore {
  const type = process.env.OBJECT_STORE_TYPE ?? 'local'
  if (type === 's3' || type === 'r2') return new S3ObjectStore()
  const dir = process.env.LOCAL_SNAPSHOT_DIR ?? './snapshots'
  return new LocalObjectStore(dir)
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}
