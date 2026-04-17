import { createSlidingWindowLimiter, getClientIpFromRequest } from "@/lib/rate-limit";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // Whisper API limit
const DEFAULT_PER_MIN = 10;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getTranscribeMaxBytes(): number {
  return parsePositiveInt(process.env.CALL_TRANSCRIBE_MAX_BYTES, DEFAULT_MAX_BYTES);
}

export function getTranscribeRatePerMinute(): number {
  return parsePositiveInt(process.env.CALL_TRANSCRIBE_RATE_PER_MIN, DEFAULT_PER_MIN);
}

const limiter = createSlidingWindowLimiter({
  windowMs: 60_000,
  max: getTranscribeRatePerMinute(),
});

export function checkTranscribeRateLimit(request: Request) {
  const key = `transcribe:${getClientIpFromRequest(request)}`;
  return limiter(key);
}

export function validateTranscribeFileSize(byteLength: number): { ok: true } | { ok: false; message: string } {
  const max = getTranscribeMaxBytes();
  if (byteLength > max) {
    const mb = (max / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      message: `Súbor je príliš veľký (max ${mb} MB). Skráťte nahrávku alebo komprimujte audio.`,
    };
  }
  return { ok: true };
}
