/* global self, caches, fetch, Response */
const CACHE_NAME = "kmkt-portal-static-v6";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/pwa-192.png",
  "/pwa-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSupabaseRequest(url) {
  return url.includes("supabase.co") || url.includes("/auth/v1/") || url.includes("/rest/v1/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url;
  if (req.method !== "GET") return;

  // Auth/data requests always go network-first to avoid stale session/data.
  if (isSupabaseRequest(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // HTML navigations: network first, fallback to cached app shell/offline note.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match("/index.html");
          if (cached) return cached;
          return new Response(
            "<!doctype html><html><body style='font-family:sans-serif;padding:24px'>Uko offline. Tafadhali washa intaneti.</body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // Static assets: cache first, then network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== "basic") return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return res;
      });
    })
  );
});
