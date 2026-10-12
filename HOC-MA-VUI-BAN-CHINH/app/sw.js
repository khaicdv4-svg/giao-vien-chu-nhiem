const CACHE_NAME = 'hmv-ban-chinh-2.9';
const APP_SHELL = ['./', './index.html', './sw.js', './backup.html', './backup-full.js', './backup-entry.js', './clip-batch-05c.js', './game-recovery-06.js', './demo-09.js', './question-bank-stage2.js', './uxui-stage5.js', './uxui-stage5.css', './question-quick-stage6.js', './question-quick-stage6.css', './question-quick-stage7.css', './question-bank-stage7.js', './bo-cau-hoi-mau.js', './kho-cau-hoi.js', './quiz-camera.js', './vong-quay.js', './toan-man-hinh.js', './ban-tay-camera.js', './bong-bay.js', './binh-chon.js', './nhac-nen.js', './trang-chu.js', './tro-ly-ai.js', './ket-qua.js', './doc-to.js', './mung-chien-thang.js', './dung-sai.js', './ban-tay-phep-thuat.js', './gio-tay-gianh-quyen.js', './ban-chinh.css', './assets/fonts/Pacifico-Vietnamese.woff2', './cover-clean.png', './thaykhaiedu-logo.png', './assets/audio/background.mp3', './assets/audio/spin.mp3', './assets/audio/win.mp3', './assets/audio/cheer.mp3', './assets/audio/ai-nhanh-hon.mp3', './assets/audio/nhac-boc-tham.mp3', './assets/audio/nhac-nghich-ngom.mp3', './assets/audio/mung-chien-thang.mp3', './assets/audio/tra-loi-dung.mp3', './assets/audio/tra-loi-sai.mp3'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  // HMV-OFFLINE-SAFETY-04-20261008: activation must preserve existing caches.
  // Other caches can contain saved lessons or belong to another app on this origin.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // BAN-CHINH 1.9: yêu cầu tới máy chủ nội bộ (/api/…) luôn đi thẳng ra mạng, không lưu đệm.
  try { if (new URL(event.request.url).pathname.indexOf('/api/') === 0) return; } catch (e) {}

  const url = event.request.url;
  const isHtml = event.request.mode === 'navigate' || url.endsWith('index.html') || url.endsWith('/');

  if (isHtml) {
    // Network-First for HTML so updates show up immediately
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached => cached || cache.match('./index.html'))))
    );
  } else {
    // Cache-First for static assets
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => cache.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          // BAN-CHINH: chỉ lưu phản hồi thành công; không lưu lỗi 404 (vd. khi chưa có ./vendor/mediapipe/).
          if (response && (response.ok || response.type === 'opaque')) cache.put(event.request, response.clone());
          return response;
        }))
      )
    );
  }
});




