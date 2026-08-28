/* sg16-transfer service worker */
const CACHE = "sg16-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-512.png", "/logo-sg16.jpg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => undefined)))).then(() => self.skipWaiting()).catch(() => undefined));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()).catch(() => undefined));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.status === 200 && fresh.type === "basic") cache.put(request, fresh.clone()).catch(() => undefined);
      return fresh;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      const shell = await cache.match("/");
      if (shell) return shell;
      throw error;
    }
  })());
});
