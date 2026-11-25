# Hướng Dẫn Cloudflare R2 & Edge Workers Cho Nanaflix

Thư mục `cloudflare/` chứa 2 Cloudflare Worker hỗ trợ CDN ảnh tĩnh và proxy luồng livestream `/live`.

---

## 1. Static Media CDN (`cloudflare/worker.js` — `media.nanaflix.asia`)

Worker phục vụ toàn bộ asset tĩnh lưu trên R2 bucket `nanaflix-media` (`tv-channels/`, `teams/`, `players/`, `actors/`, `avatars/`, `banners/`, `tournaments/`...) kết hợp Cloudflare Edge Cache (`caches.default`) và header `immutable` 1 năm.

> [!NOTE]
> Luồng `/cache/{domain}/{path}` proxy ảnh từ `phimimg.com` / `ophim` đã được gỡ bỏ vì hệ thống đã ưu tiên ảnh trực tiếp từ TMDb / nguồn phim. Worker sẽ trả `410 Gone` cho mọi URL `/cache/*`.

### Triển khai nhanh
1. Mở [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages** -> Worker `nanaflix-media-worker`.
2. Dán nội dung `cloudflare/worker.js` vào editor -> **Deploy** (hoặc chạy `cd cloudflare && npx wrangler deploy`).
3. Đảm bảo đã gắn R2 Bucket Binding `MEDIA_BUCKET` -> `nanaflix-media` và Custom Domain `media.nanaflix.asia`.

---

## 2. Live HLS Stream Proxy (`cloudflare/stream-proxy-worker.js`)

Worker thay thế `/api/live-football/proxy` khi cấu hình biến môi trường `NEXT_PUBLIC_STREAM_PROXY_URL` trên Vercel trỏ về domain Worker (ví dụ `https://stream-proxy.nanaflix.workers.dev`), giúp tách toàn bộ băng thông `.m3u8` / `.ts` khỏi hạn mức 100 GB/tháng của Vercel Hobby.

### Triển khai nhanh
1. Tạo Worker mới trên Cloudflare (ví dụ `nanaflix-stream-proxy`) và dán nội dung `cloudflare/stream-proxy-worker.js`.
2. Vào **Settings -> Variables and Secrets**, thêm secret **`STREAM_TOKEN_SECRET`** khớp đúng với `STREAM_TOKEN_SECRET` (hoặc fallback secret đang dùng) trên Vercel.
3. Trên Vercel, đặt `NEXT_PUBLIC_STREAM_PROXY_URL` = URL của Worker đó rồi redeploy.
