export function validateUUID(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

export function validatePhone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const cleaned = value.replace(/[\s\-()]/g, "");
  return /^(\+421|0)[0-9]{9}$/.test(cleaned);
}

export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength).replace(/[<>]/g, "");
}
