# Hướng Dẫn Tối Ưu Hóa Cloudflare R2 & Edge Worker Cho Nanaflix

Tài liệu này hướng dẫn chi tiết cách triển khai **Cloudflare Worker tại media.nanaflix.asia** (Gợi ý Cấp 2) và **Cấu hình Quy tắc Tự động Dọn rác Lifecycle Rule** (Gợi ý Cấp 3).

---

## 🚀 GỢI Ý CẤP 2: Triển Khai Cloudflare Worker (media.nanaflix.asia)

Worker này biến `media.nanaflix.asia` thành một CDN thông minh chạy 100% trên mạng lưới Cloudflare:
* File đã có trên R2 -> Trả về ngay trong 10-15ms (0đ băng thông, 0ms Vercel).
* File chưa có trên R2 -> Tự động kéo từ `phimimg.com`, lưu vào R2 rồi trả về cho khách.
* Tiết kiệm **100% CPU & Băng thông cho Vercel**.

### Cách 1: Triển khai trực tiếp qua Cloudflare Dashboard (Khuyên dùng - 2 phút)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Vào mục **Workers & Pages** -> Bấm **Create application** -> **Create Worker**.
3. Đặt tên Worker: `nanaflix-media-worker` -> Bấm **Deploy**.
4. Bấm **Edit code**:
   * Copy toàn bộ nội dung trong file `cloudflare/worker.js` dán đè vào trình soạn thảo.
   * Bấm **Deploy** (hoặc Save and Deploy).
5. Gắn R2 Bucket Binding (Rất quan trọng):
   * Quay lại trang tổng quan của Worker -> Vào thẻ **Settings** -> **Variables and Secrets** (hoặc **Bindings**).
   * Tại mục **R2 Bucket Bindings**, bấm **Add binding**:
     * **Variable name**: Nhập chính xác `MEDIA_BUCKET`
     * **R2 Bucket**: Chọn `nanaflix-media`
   * Bấm **Save and deploy**.
6. Gắn Domain `media.nanaflix.asia`:
   * Vào thẻ **Settings** của Worker -> Chọn mục **Domains & Routes** -> Bấm **Add** -> Chọn **Custom Domain**.
   * Nhập: `media.nanaflix.asia`.
   * Cloudflare sẽ tự động trỏ subdomain về Worker này và cấp chứng chỉ SSL miễn phí.

### Cách 2: Triển khai bằng Wrangler CLI

Nếu máy tính của bạn đã cài đặt Node.js:
```bash
cd cloudflare
npx wrangler login
npx wrangler deploy
```

---

## 🧹 GỢI Ý CẤP 3: Cấu Hình Tự Động Dọn Rác (Object Lifecycle Rules)

Để đảm bảo tổng dung lượng lưu trữ trên R2 không bao giờ vượt quá 10 GB miễn phí, bạn cấu hình xóa các ảnh phim cache cũ sau 90 ngày:

1. Trong [Cloudflare Dashboard](https://dash.cloudflare.com), vào mục **R2** ở thanh bên trái.
2. Chọn bucket **nanaflix-media**.
3. Chuyển sang thẻ **Settings** (Cài đặt) -> Cuộn xuống mục **Object lifecycle rules**.
4. Bấm **Add rule**:
   * **Rule name**: `Auto-delete old movie cache`
   * **Prefix**: Nhập chính xác `cache/` (Lưu ý: Chỉ dọn thư mục cache phim, KHÔNG ảnh hưởng đến `avatars/` hay `covers/`).
   * **Action**: Chọn **Delete objects**.
   * **Age**: Nhập `90` (hoặc `120`) ngày.
5. Bấm **Add rule** (Lưu lại).

🎉 **Xong!** Kể từ bây giờ:
* Toàn bộ ảnh cache của các bộ phim cũ không ai xem quá 3 tháng sẽ tự động bị xóa sạch.
* Dung lượng bucket sẽ luôn ổn định quanh mức 3 GB – 6 GB.
* Các ảnh avatar người dùng (`avatars/`), ảnh bìa (`covers/`), logo bóng đá (`teams/`) được lưu vĩnh viễn không bao giờ bị xóa.
