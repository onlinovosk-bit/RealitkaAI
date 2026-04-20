export const TRANSCRIBE_MAX_FILE_SIZE_MB = 25;
export const TRANSCRIBE_ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"];
export function isFileSizeAllowed(b: number): boolean {
  return b <= TRANSCRIBE_MAX_FILE_SIZE_MB * 1024 * 1024;
}
export function isMimeTypeAllowed(m: string): boolean {
  return TRANSCRIBE_ALLOWED_MIME_TYPES.includes(m);
}
