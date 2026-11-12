// Nanaflix PWA Service Worker (Optimal Standard)
// Tự động phân tách: HTML Pages (Network-First) & Static Hashed Chunks (Cache-First)
// Bạn không bao giờ phải tăng phiên bản thủ công nữa.

const CACHE_NAME = 'nanaflix-static-v2';
const isLocalDevHost = () => {
  const host = self.location && self.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};
const PRECACHE_STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  if (isLocalDevHost()) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_STATIC_ASSETS))
      .catch((err) => {
        console.warn('[SW] Pre-caching partial failure:', err);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (isLocalDevHost() || cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        if (isLocalDevHost() && self.registration) {
          return self.registration.unregister();
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Tuyệt đối không cache hay can thiệp request khi chạy local dev (Next.js dev chunks không có immutable content hash)
  if (isLocalDevHost()) return;

  // Chỉ áp dụng cho GET requests cùng domain
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Không can thiệp vào video streaming, Firebase, external APIs và nội bộ API routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('phim')
  ) {
    return;
  }

  // 2. Với Navigation Requests (trang HTML: /, /browse, /movies/...):
  // LUÔN LUÔN Network-First để khi bạn push code, người dùng nhận ngay giao diện mới từ Cloudflare/Vercel.
  // Tuyệt đối không lưu đè HTML vào CacheStorage để tránh lỗi kẹt giao diện cũ.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Chỉ fallback về cache nếu người dùng mất mạng hoàn toàn (offline)
        return caches.match(event.request);
      })
    );
    return;
  }

  // 3. Với Next.js Static Chunks (_next/static/...) và PWA assets:
  // Các file này luôn có mã hash bất biến trong URL (e.g. app-8f2a1b.js), cực kỳ an toàn để Cache-First.
  // Giúp web tải siêu tốc 0ms mà không bao giờ bị xung đột phiên bản.
  if (url.pathname.startsWith('/_next/static/') || PRECACHE_STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }
});
