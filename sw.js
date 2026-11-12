// Offline support for the trip site. Bump VERSION when the list of files changes.
const VERSION = "v1";
const SHELL = "jp27-shell-" + VERSION, RUNTIME = "jp27-runtime", TILES = "jp27-tiles";
const CORE = ["./", "index.html", "tokyo-map.html", "hakone-map.html", "kyoto-map.html", "osaka-map.html",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "booking-reminders.ics",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
const TILE_HOSTS = ["server.arcgisonline.com", "tile.openstreetmap.org"];
const TILE_LIMIT = 2500;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("jp27-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cacheName, max){
  const c = await caches.open(cacheName), keys = await c.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => c.delete(k)));
}
// Our own pages: try the network first so edits show up, fall back to the saved copy.
async function pageFirst(req){
  const cache = await caches.open(SHELL);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(req, {signal: ctl.signal}); clearTimeout(t);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req, {ignoreSearch: true})) || (await cache.match("index.html")) || Response.error();
  }
}
// Libraries, fonts and map tiles: saved copy first, otherwise fetch and keep.
async function cacheFirst(req, cacheName, limit){
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type !== "opaque"){
      const c = await caches.open(cacheName); c.put(req, res.clone());
      if (limit && Math.random() < 0.05) trim(cacheName, limit);
    }
    return res;
  } catch (err) { return Response.error(); }
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin){ e.respondWith(pageFirst(req)); return; }
  if (TILE_HOSTS.some(h => url.hostname.endsWith(h))){ e.respondWith(cacheFirst(req, TILES, TILE_LIMIT)); return; }
  if (/(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){ e.respondWith(cacheFirst(req, RUNTIME)); return; }
});
