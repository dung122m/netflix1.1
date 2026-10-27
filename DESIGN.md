# DESIGN SYSTEM & TOKENS — NANAFLIX

## 1. Visual Foundation
- **Theme:** Dark-only (không có chế độ light mode trên giao diện người dùng).
- **Surface Hierarchy:**
  - Base canvas: `bg-black` / `bg-zinc-950`
  - Cards & Rows: `bg-zinc-900/80` hoặc `from-zinc-800/70 via-zinc-900 to-zinc-950`
  - Floating Overlays & Dropdowns: `bg-zinc-900/95` kết hợp `backdrop-blur-md`
- **Hairline Borders:** `border border-white/10` (trạng thái hover: `border-white/25`), triệt tiêu viền dày, thô cứng hoặc viền lồng viền (nested borders).
- **Brand Colors:**
  - Netflix Red: `#E50914` (`oklch(0.55 0.23 25)`)
  - Amber / Accent: `#F59E0B` (`amber-400` / `amber-500`)
  - Live Red Pulse: `#EF4444` (`red-500` / `rose-500`)
  - Text scales: Trắng `text-white`, xám bạc `text-zinc-300`, xám dịu `text-zinc-400` (đảm bảo độ tương phản đọc theo chuẩn WCAG).

## 2. Spacing & Sizing Grid
- **Lưới khoảng cách:** Bội số 4/8px (2px, 4px, 6px, 8px, 12px, 16px, 20px, 24px, 32px).
- **Touch Targets:** Tối thiểu 36px (khuyên dùng 38–44px) cho toàn bộ các nút bấm và icon trên mobile.
- **Card Aspect Ratios:** Thẻ phim chân dung `aspect-[2/3]`, video thumbnail `aspect-video` để triệt tiêu hoàn toàn Layout Shift (CLS).

## 3. Typography & Tiếng Việt
- **Font:** Inter / Sans-serif hệ thống.
- **Diacritics Safety:** `line-height` tối thiểu `leading-[1.4]` cho tiêu đề nhiều dòng tiếng Việt, đảm bảo dấu mũ (`ấ, ế, ố, ứ`) và dấu nặng/hỏi không bị `overflow: hidden` xén cụt.
- **Flexbox Discipline:** Mọi container flexbox/grid chứa text động bắt buộc phải có `min-w-0` để ngăn tràn trang ngoài ý muốn.
- **Responsive Abbreviations:** Sử dụng nhãn rút gọn thích ứng trên mobile hẹp (ví dụ: `Live` thay vì `Đang diễn ra`, `Tất cả` thay vì `Tất cả môn`).

## 4. Motion & Easing
- **Easing Curve:** `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Card Scale:** Chỉ phóng to nhẹ (`scale-[1.02]`), không scale quá `1.05`.
- **Accessibility:** Tôn trọng `motion-reduce:transform-none`.
