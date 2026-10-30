# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người dùng Việt Nam theo dõi phim điện ảnh, truyền hình, anime và các trận cầu thể thao trực tiếp chất lượng cao (Full HD / 1080p Ultra-Low Latency) trên đa thiết bị, đặc biệt ưu tiên trải nghiệm mượt mà, thao tác một tay trên điện thoại di động (mobile-first).

## Product Purpose

Nanaflix là nền tảng giải trí trực tuyến tổng hợp (Movies, TV Series, Anime, Live Football & Sports) mang lại trải nghiệm xem tức thì, không giật lag, giao diện chuẩn điện ảnh kết hợp phong cách Netflix × YouTube Premium UI.

## Positioning

Content-first & Zero CLS: Tải phim tức thì, loại bỏ hoàn toàn các rào cản tương tác hoặc trang trí thừa thãi. Trải nghiệm thể thao thông minh với Live Hub tự động nhận diện trận cầu trực tiếp, thời lượng bù giờ, sự kiện đặc biệt và phân loại giải đấu tự động.

## Operating Context

- Trình duyệt di động và máy tính để bàn (Chrome, Safari, Firefox, Edge).
- Trải nghiệm xem ban đêm và điều kiện ánh sáng yếu với giao diện Dark-only.
- Thao tác nhanh bằng một tay (thumb zone navigation) trên màn hình cảm ứng di động.

## Capabilities and Constraints

- Dark-only UI: Không hỗ trợ Light mode trên giao diện người dùng.
- Chuẩn streaming video HLS/MP4 với trình phát đa năng tương thích phụ đề & đa luồng âm thanh.
- Tự động fallback dữ liệu khi API nguồn có sự cố.
- Tối ưu hóa phông chữ tiếng Việt có dấu (`leading-[1.4]`, chống xén cụt dấu mũ và dấu nặng).

## Brand Commitments

- **Tên sản phẩm:** Nanaflix
- **Màu nhận diện chính:** Netflix Red (`#E50914`), Dark zinc canvas (`#09090B`), Accent Amber (`#F59E0B`), Live Red Pulse (`#EF4444`).
- **Phong cách:** Hiện đại, tinh tế, mượt mà, đáng tin cậy.

## Evidence on Hand

- Toàn bộ source code frontend Next.js 16 + Tailwind CSS v4 tại `src/`.
- Tài liệu quy chuẩn thiết kế tại [DESIGN.md](DESIGN.md) và [`.agents/rules/pixel-perfect-taste.md`](.agents/rules/pixel-perfect-taste.md).

## Product Principles

1. **Nội dung là trung tâm (Content-First):** Giao diện lùi lại phía sau để tôn vinh poster và video stream.
2. **Kỷ luật Pixel-Perfect:** Thẳng hàng tuyệt đối, viền siêu mảnh hairline `border-white/10`, không giật khung hình (CLS).
3. **An toàn Tiếng Việt:** Đảm bảo toàn bộ dấu thanh tiếng Việt hiển thị đầy đủ, không bị cắt xén trong flexbox hay vùng giới hạn chiều cao.
4. **Mượt mà & Nhẹ nhàng:** Hiệu ứng chuyển cảnh tinh tế, tôn trọng `prefers-reduced-motion`.

## Accessibility & Inclusion

- Chuẩn tiếp cận WCAG AA về độ tương phản chữ trên nền tối (tối thiểu 4.5:1 cho text thông thường).
- Touch target tối thiểu 36px (khuyên dùng 38–44px) cho toàn bộ nút bấm và icon trên mobile.
