const STORAGE_KEY = "revolis_sprievodca_session_id";

/** Stable anonymous session id for sprievodca funnel events (client-only). */
export function getOrCreateSprievodcaSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}
