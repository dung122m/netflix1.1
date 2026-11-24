---
trigger: always_on
description: Debugging, code modification, and anti-flickering discipline for Nanaflix
---

# Debugging & Code Modification Discipline (KỶ LUẬT SỬA CODE & KHẮC PHỤC LỖI)

Quy tắc bắt buộc tuân thủ 100% khi debug, sửa lỗi hoặc tối ưu bất kỳ tính năng nào trong dự án Nanaflix:

## 1. Tracing gốc rễ trước khi gõ phím (Root-Cause Trace First)
- **Cấm tuyệt đối:** Thấy lỗi ở đâu là nhảy ngay vào component ở đó để chèn logic chắp vá.
- **Quy trình chuẩn:**
  1. Dừng lại, đọc kỹ triệu chứng và truy ngược luồng dữ liệu 1 chiều:
     `Upstream API -> Server Service -> Cache (Redis / Memory) -> Next.js SSR -> Client Hook / Component -> LocalStorage`.
  2. Xác định chính xác 1 điểm gốc rễ gây ra lỗi (Single Source of Truth) và chỉ sửa tại đúng điểm đó.

## 2. Tuyệt đối cấm Hardcode (Zero-Hardcode Invariant)
- **Nghiêm cấm:** Chèn bất kỳ điều kiện `if (item.slug === "...")`, `if (id === "...")`, hay hardcode hash URL ảnh / mã phim để xử lý cho một trường hợp cá biệt.
- **Yêu cầu:** Mọi giải pháp bắt buộc phải là **Generic Architecture (kiến trúc tổng quát)**:
  - Dựa trên quy luật dữ liệu: đối chiếu ngữ nghĩa (Semantic Validation), token overlap, ngôn ngữ gốc (`original_language`), quốc gia, độ lệch năm phát hành.
  - Phải đúng cho 10.000 bộ phim, không bao giờ vì 1 bộ phim mà viết code ngoại lệ.

## 3. Chống nháy đổi ảnh & Cấm tráo đổi UI (Anti-Flickering & No Hot-Swapping)
- **Nguyên tắc vàng về UX:** Cái gì đang hiển thị ổn định thì giữ nguyên. Không bao giờ tráo đổi ảnh/nội dung ngay trước mắt người dùng.
- **Quy tắc thẻ phim (`MediaCard`, `MoviePosterImage`, `ContinueWatchingCard`):**
  - Nếu thẻ đã có ảnh hợp lệ: Hiển thị duy nhất ảnh đó. **TUYỆT ĐỐI KHÔNG chạy fallback ngầm để gọi `setSrc` tráo đổi sang TMDb**, vì việc đổi `src` của thẻ `<img>` đang xem sẽ làm trình duyệt phải vẽ lại và gây ra hiện tượng **nháy giật hàng loạt** trên màn hình.
  - Việc nâng cấp ảnh chất lượng cao (TMDb WebP) phải diễn ra ở **Server-Side (Next.js SSR/ISR) và Redis Cache** trước khi HTML gửi về client.
  - Client fallback chỉ được kích hoạt trong 2 trường hợp:
    1. Thẻ hoàn toàn không có bất kỳ ảnh nào (`!candidate`).
    2. Ảnh bị lỗi tải thực sự (`onError` / `handleImageError` do 404 hoặc ISP chặn).

## 4. Kỷ luật vòng đời Cache (Cache Lifecycle & Invalidation)
- Khi sửa đổi logic so khớp dữ liệu hoặc cấu trúc lưu trữ, **bắt buộc phải nâng version cache**:
  - Redis cache key (ví dụ: `v2` -> `v3`).
  - LocalStorage / SessionStorage key trên client (ví dụ: `v4` -> `v5`).
- Tuyệt đối không để code mới chạy trên nền dữ liệu cache bẩn của phiên bản cũ.

## 5. Tự kiểm tra `git diff` trước khi bàn giao
- Sau khi chạy `npm test` và `npm run typecheck` đạt 0 lỗi:
- Phải tự chạy `git diff` và đọc lại từng dòng code đã sửa dưới góc nhìn khắt khe:
  - *Có dòng nào hardcode không?*
  - *Có gây re-render thừa hay nháy giao diện không?*
  - *Diff có gọn gàng, đúng trọng tâm không?*
