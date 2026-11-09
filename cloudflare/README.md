# Nanaflix - Cloudflare Edge Stream Proxy Worker (Zero Vercel Bandwidth)

## Tổng quan
Giải pháp này chuyển 100% lưu lượng xem trực tiếp bóng đá & TV (các file video chunk `.ts`, `.m4s`, playlist `.m3u8`) từ Vercel Serverless Function sang chạy trực tiếp trên **Cloudflare Edge Worker**:
- **Băng thông Vercel**: Giảm từ 100% về **0.00%**.
- **Chi phí băng thông**: **0đ** (Cloudflare miễn phí không giới hạn băng thông Egress).
- **Hạn mức Worker miễn phí**: 100.000 requests / ngày (~3.000.000 requests / tháng).
- **Độ trễ**: Dưới 5ms nhờ mạng lưới Edge toàn cầu (Point of Presence tại Singapore và Việt Nam).

---

## Cách triển khai (2 phút, không cần cài đặt gì thêm)

### Bước 1: Tạo Worker trên Cloudflare Dashboard
1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Chọn menu bên trái: **Workers & Pages** -> Bấm **Create application** -> **Create Worker**.
3. Đặt tên worker: ví dụ `nanaflix-stream-proxy`.
4. Bấm **Deploy**.

### Bước 2: Dán mã nguồn Worker
1. Sau khi deploy xong, bấm **Edit code**.
2. Xóa toàn bộ nội dung mặc định và dán nội dung từ file [`stream-proxy-worker.js`](./stream-proxy-worker.js) vào.
3. Bấm **Deploy**.

### Bước 3: Cấu hình Secret (Tùy chọn nhưng khuyến nghị)
1. Trong trang cài đặt của Worker vừa tạo, vào tab **Settings** -> **Variables and Secrets**.
2. Thêm biến môi trường:
   - Tên biến: `STREAM_TOKEN_SECRET`
   - Giá trị: Chuỗi bí mật của bạn (giống giá trị trong file `.env.local` của Vercel).
3. Bấm **Save and deploy**.

### Bước 4: Định tuyến (Chọn 1 trong 2 cách)

#### Cách A: Dùng Route trên tên miền chính (Khuyến nghị nhất)
Vào Cloudflare -> Chọn domain `nanaflix.asia` -> **Workers Routes** -> **Add route**:
- Route: `nanaflix.asia/api/live-football/proxy*` -> Chọn Worker `nanaflix-stream-proxy`.
- Route: `nanaflix.asia/api/live-tv/proxy*` -> Chọn Worker `nanaflix-stream-proxy`.

*Khi cấu hình xong, mọi yêu cầu video proxy từ trình duyệt của người dùng sẽ được Cloudflare Edge chặn và xử lý ngay tại Singapore, hoàn toàn không chạm vào Vercel!*

#### Cách B: Dùng Custom Subdomain
1. Trong Worker -> **Settings** -> **Triggers** -> **Custom Domains**: Thêm `proxy.nanaflix.asia`.
2. Trên Vercel Dashboard, thêm biến môi trường:
   - `NEXT_PUBLIC_STREAM_PROXY_URL=https://proxy.nanaflix.asia/api/live-football/proxy`
   - `NEXT_PUBLIC_TV_PROXY_URL=https://proxy.nanaflix.asia/api/live-tv/proxy`
