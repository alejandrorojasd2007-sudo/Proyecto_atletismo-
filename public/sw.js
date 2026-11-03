const V = 'velocity-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(['/', '/manifest.json', '/icons/icon-192.png'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const r = e.request
  const u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(V).then((x) => x.put('/', c)).catch(() => {}); return res }).catch(() => caches.match('/')))
    return
  }
  e.respondWith(caches.match(r).then((h) => h || fetch(r).then((res) => {
    if (res.ok && res.status === 200) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)).catch(() => {}) }
    return res
  })))
})
