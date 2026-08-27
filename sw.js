const CACHE_NAME = 'gvc-app-v25-ai-2a';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './sw.js', './cover-clean.png', './thaykhaiedu-logo.png', './assets/fonts/Lexend-Vietnamese-Variable.woff2', './assets/audio/background.mp3', './assets/audio/spin.mp3', './assets/audio/win.mp3', './assets/audio/cheer.mp3'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gvc-app-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
