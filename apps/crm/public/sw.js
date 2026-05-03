// ================================================================
// Revolis.AI Service Worker v2 — Offline cache + Web Push
// ================================================================

const CACHE_NAME = "revolis-v2";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
  "/playbook",
  "/leads",
  "/dashboard",
  "/offline",
];

// ── Install: precache shell routes ──────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {})
    )
  );
});

// ── Activate: clear old caches ───────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ─────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API: network-first, no cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Pages: network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached ?? (await caches.match(OFFLINE_URL)) ?? new Response("Offline", { status: 503 });
      })
  );
});

// ── Web Push ─────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Revolis.AI", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Revolis.AI", {
      body: data.body,
      icon: data.icon || "/icons/revolis-192.png",
      badge: data.badge || "/icons/revolis-badge-72.png",
      tag: data.tag || "revolis-brief",
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.data?.urgency === "high",
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "/playbook";

  if (action === "dismiss") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) =>
          c.url.includes(self.location.host)
        );
        if (existing) {
          existing.focus();
          existing.navigate(url);
          return;
        }
        return clients.openWindow(url);
      })
  );
});
