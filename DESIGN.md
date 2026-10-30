---
name: Nanaflix
description: Dark-only cinematic streaming platform for movies, series, and live sports
colors:
  primary: "#E50914"
  primary-hover: "#B8070F"
  background: "#09090B"
  surface: "#18181B"
  surface-card: "rgba(24, 24, 27, 0.80)"
  surface-overlay: "rgba(24, 24, 27, 0.95)"
  accent-amber: "#F59E0B"
  accent-cyan: "#00B4D8"
  accent-purple: "#A855F7"
  accent-emerald: "#10B981"
  accent-rose: "#F43F5E"
  live-pulse: "#EF4444"
  text-primary: "#FFFFFF"
  text-secondary: "#D4D4D8"
  text-muted: "#A1A1AA"
  border-hairline: "rgba(255, 255, 255, 0.10)"
  border-hover: "rgba(255, 255, 255, 0.25)"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  heading:
    fontFamily: "Inter, sans-serif"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-media:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
---

# Design System — Nanaflix

## Overview

Nanaflix áp dụng ngôn ngữ thiết kế Dark-only điện ảnh cao cấp kết hợp phong cách Netflix × YouTube Premium UI, tối ưu đặc biệt cho trải nghiệm thao tác một tay trên thiết bị di động (mobile-first) và bảo đảm triệt tiêu hoàn toàn hiện tượng giật khung hình (CLS - Cumulative Layout Shift).

## Colors

- **Base Canvas:** `bg-black` (`#000000`) và `bg-zinc-950` (`#09090B`).
- **Surfaces & Cards:** `bg-zinc-900/80` (`#18181B` kết hợp độ trong suốt) hoặc gradient tinh tế `from-zinc-800/70 via-zinc-900 to-zinc-950`.
- **Floating Overlays & Modals:** `bg-zinc-900/95` kết hợp `backdrop-blur-md`.
- **Thương hiệu & Điểm nhấn:**
  - Netflix Red: `#E50914` (`oklch(0.55 0.23 25)`) dùng cho nút hành động chính, active tab indicator, thanh tua video.
  - Amber Gold: `#F59E0B` (`amber-400` / `amber-500`) dùng cho rating phim, cúp giải đấu, badge chất lượng cao.
  - Live Red Pulse: `#EF4444` (`red-500` / `rose-500`) có hiệu ứng pulse nhấp nháy báo hiệu trận đấu / kênh TV đang phát trực tiếp.
- **Phân cấp màu chữ (WCAG AA):**
  - Tiêu đề & nội dung chính: Trắng sáng `text-white` (`#FFFFFF`).
  - Thông tin phụ & metadata: Xám bạc `text-zinc-300` (`#D4D4D8`).
  - Nhãn mác & phụ đề: Xám dịu `text-zinc-400` (`#A1A1AA`), không được giảm dưới ngưỡng tương phản đọc được.

## Typography

- **Phông chữ hệ thống:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **An toàn dấu Tiếng Việt (Diacritics Safety):**
  - Mọi tiêu đề tiếng Việt nhiều dòng bắt buộc giữ `line-height` tối thiểu `leading-[1.4]` (hoặc `leading-snug`).
  - Tuyệt đối không ép cứng `height` nhỏ hơn `(cỡ chữ × 1.4 × số dòng) + đệm dấu` để tránh `overflow: hidden` xén cụt dấu mũ (`ấ, ế, ố, ứ`) và dấu nặng/hỏi.
- **Kỷ luật Flexbox & Cắt dòng (Truncation):**
  - Mọi container flexbox/grid chứa nội dung text động bắt buộc phải có `min-w-0` để ngăn flex child bung vỡ layout trang.
  - Tiêu đề phim dùng `line-clamp-2` (hoặc `line-clamp-1`), thông tin metadata dùng `truncate` đúng 1 dòng kèm `min-w-0`.

## Layout

- **Hệ thống khoảng cách:** Bội số 4px/8px (2px, 4px, 6px, 8px, 12px, 16px, 20px, 24px, 32px).
- **Phòng chống Layout Shift (Zero CLS):**
  - Thẻ phim chân dung (Movie Card): Bắt buộc tỷ lệ `aspect-[2/3]` với nền placeholder `bg-zinc-900`.
  - Thẻ video thể thao / Live TV / Backdrop: Bắt buộc tỷ lệ `aspect-video` (16:9).
- **Touch Targets:** Tối thiểu 36px (khuyên dùng 38–44px) cho toàn bộ các nút bấm và icon trên mobile.
- **Mobile Responsive:** Chuyển đổi nhãn rút gọn thích ứng trên mobile hẹp (ví dụ: `Live` thay vì `Đang diễn ra`, `Tất cả` thay vì `Tất cả môn`).

## Elevation & Depth

- **Hairline Borders:** Sử dụng đường viền siêu mảnh `border border-white/10` (trạng thái hover: `border-white/25`) để phân tách không gian nhẹ nhàng mà không tạo cảm giác thô cứng.
- **Bóng đổ & Chiều sâu:** Đổ bóng mềm nhiều tầng `shadow-xl shadow-black/50`, không dùng bóng viền thô cứng neobrutalist.
- **Glassmorphism:** Sử dụng `backdrop-blur-md` kết hợp `bg-black/60` cho các badge nổi trên poster phim.

## Shapes

- **Bán kính bo góc (Border Radius):**
  - Nút bấm nhỏ & Badge: `rounded-md` (6px - 8px).
  - Thẻ phim & Thẻ thể thao: `rounded-xl` (12px - 14px).
  - Modal & Dropdown: `rounded-2xl` (16px).
  - Tag pill & Avatar: `rounded-full`.

## Components

- **MediaCard:** Thẻ poster dọc `aspect-[2/3]`, hiệu ứng hover phóng to nhẹ `scale-[1.02]`, viền hairline `border-white/10`, badge chất lượng góc trên mờ nền `backdrop-blur-md`.
- **MatchCard:** Thẻ thể thao ngang `aspect-video` hoặc dạng danh sách gọn, hiển thị tỷ số trực tiếp, thời gian thực, huy hiệu giải đấu và nút xem nhanh.
- **VideoPlayer:** Khung xem phim trung tâm, thanh điều khiển nổi tự động ẩn sau 3 giây, nút tua 10s, danh sách server và tập phim trượt ngang dễ chọn bằng ngón cái.
- **Navbar & Navigation:** Cố định đỉnh màn hình với `backdrop-blur-lg bg-black/80`, viền đáy `border-b border-white/10`.

## Do's and Don'ts

### Do's
- Luôn đặt `min-w-0` cho các flex item chứa tiêu đề hoặc văn bản dài.
- Giữ tỷ lệ khung hình cố định (`aspect-[2/3]`, `aspect-video`) cho mọi thẻ hiển thị media.
- Sử dụng `cubic-bezier(0.16, 1, 0.3, 1)` cho mọi hiệu ứng chuyển động và phóng to nhẹ khi hover (`scale-[1.02]`).
- Luôn kiểm tra giao diện trên màn hình mobile 375px - 390px trước khi xuất xưởng.

### Don'ts
- Không bao giờ dùng chế độ sáng (Light mode) trên giao diện streaming.
- Không dùng viền dày thô cứng hoặc viền lồng viền (nested borders).
- Không để phát sinh thanh cuộn ngang ngoài ý muốn trên toàn trang (`overflow-x: hidden`).
- Không xén cụt dấu tiếng Việt bằng các container có chiều cao cố định quá sát.
- Không phóng to card quá mức khi hover (tối đa `scale-[1.03]`).
