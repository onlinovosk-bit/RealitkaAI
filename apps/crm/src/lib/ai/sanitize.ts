/**
 * PII sanitization layer for outbound AI calls.
 *
 * Detects: email addresses, Slovak/Czech phone numbers, IBANs, Slovak birth numbers (RČ).
 * Also masks values of known contact field names (email, phone) in structured objects.
 *
 * Usage:
 *   const { sanitized, vault } = sanitizeText(rawPrompt)
 *   const response = await callModel(sanitized)
 *   const clean    = rehydrate(response, vault)
 *
 * The vault is ephemeral — one per AI call, never stored.
 */

export type Vault = Record<string, string>

// ─── PII regex patterns ────────────────────────────────────────────────────
const PATTERNS: Array<{ key: string; regex: RegExp }> = [
  {
    key: 'EMAIL',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  },
  {
    key: 'PHONE',
    // Explicit SK/CZ prefix (+421/+420) or Slovak 09xx mobile format
    regex: /(\+421|\+420)[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|(?<![0-9])0[689]\d[\s\-]?\d{3}[\s\-]?\d{3}(?![0-9])/g,
  },
  {
    key: 'IBAN',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
  },
  {
    key: 'RC',
    // Slovak/Czech birth number: XXXXXX/XXXX or XXXXXX/XXX
    regex: /\b\d{6}\/\d{3,4}\b/g,
  },
]

// Object field names whose string values are always masked
const PII_FIELD_NAMES = new Set([
  'email', 'phone', 'tel', 'mobile', 'phone_number',
  'fromEmail', 'toEmail', 'replyTo',
])

// ─── Vault helpers ─────────────────────────────────────────────────────────
function intern(vault: Vault, key: string, value: string): string {
  const existing = Object.entries(vault).find(([, v]) => v === value)
  if (existing) return existing[0]
  const count = Object.keys(vault).filter(k => k.startsWith(`[${key}_`)).length
  const placeholder = `[${key}_${count + 1}]`
  vault[placeholder] = value
  return placeholder
}

// ─── Public API ────────────────────────────────────────────────────────────
export function sanitizeText(text: string, vault: Vault = {}): { sanitized: string; vault: Vault } {
  let result = text
  for (const { key, regex } of PATTERNS) {
    result = result.replace(new RegExp(regex.source, regex.flags), match =>
      intern(vault, key, match)
    )
  }
  return { sanitized: result, vault }
}

export function sanitizeObject(obj: unknown, vault: Vault = {}): { sanitized: unknown; vault: Vault } {
  if (obj === null || obj === undefined) return { sanitized: obj, vault }

  if (typeof obj === 'string') {
    return { sanitized: sanitizeText(obj, vault).sanitized, vault }
  }

  if (typeof obj !== 'object') return { sanitized: obj, vault }

  if (Array.isArray(obj)) {
    return { sanitized: obj.map(item => sanitizeObject(item, vault).sanitized), vault }
  }

  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELD_NAMES.has(k.toLowerCase()) && typeof v === 'string' && v.trim()) {
      result[k] = intern(vault, 'PII', v)
    } else {
      result[k] = sanitizeObject(v, vault).sanitized
    }
  }
  return { sanitized: result, vault }
}

type MessageContent = string | Array<{ type: string; text?: string; [k: string]: unknown }>
type MessageLike = { role: string; content: MessageContent }

export function sanitizeMessages(messages: MessageLike[], vault: Vault = {}): {
  messages: MessageLike[]
  vault: Vault
} {
  const sanitized = messages.map(msg => {
    if (typeof msg.content === 'string') {
      return { ...msg, content: sanitizeText(msg.content, vault).sanitized }
    }
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map(block =>
          block.type === 'text' && typeof block.text === 'string'
            ? { ...block, text: sanitizeText(block.text, vault).sanitized }
            : block
        ),
      }
    }
    return msg
  })
  return { messages: sanitized, vault }
}

type SystemParam = string | Array<{ type: string; text?: string; [k: string]: unknown }> | undefined

export function sanitizeSystem(system: SystemParam, vault: Vault): SystemParam {
  if (!system) return system
  if (typeof system === 'string') return sanitizeText(system, vault).sanitized
  return system.map(block =>
    block.type === 'text' && typeof block.text === 'string'
      ? { ...block, text: sanitizeText(block.text, vault).sanitized }
      : block
  )
}

export function rehydrate(text: string, vault: Vault): string {
  if (!Object.keys(vault).length) return text
  let result = text
  // Sort by placeholder length desc to prevent partial match (e.g. [EMAIL_10] before [EMAIL_1])
  const entries = Object.entries(vault).sort((a, b) => b[0].length - a[0].length)
  for (const [placeholder, original] of entries) {
    result = result.split(placeholder).join(original)
  }
  return result
}
