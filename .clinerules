<!-- AUTO-GENERATED from AGENTS.md — do not edit directly.
     Run `bash scripts/sync-agent-rules.sh` to regenerate. -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Website Reverse-Engineer Template

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — just run `/clone-website <url1> [<url2> ...]`.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Radix primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with oklch design tokens
- **Deployment:** Vercel

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    icons.tsx       # Extracted SVG icons as React components
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  images/           # Downloaded images from target site
  videos/           # Downloaded videos from target site
  seo/              # Favicons, OG images, webmanifest
docs/
  research/         # Inspection output (design tokens, components, layout)
  design-references/ # Screenshots and visual references
scripts/            # Asset download scripts
```

## MOST IMPORTANT NOTES
- When launching Claude Code agent teams, ALWAYS have each teammate work in their own worktree branch and merge everyone's work at the end, resolving any merge conflicts smartly since you are basically serving the orchestrator role and have full context to our goals, work given, work achieved, and desired outcomes.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific instruction files.
- After editing `.claude/skills/clone-website/SKILL.md`, run `node scripts/sync-skills.mjs` to regenerate the skill for all platforms.

## Media & Image CDN Rules (STRICT INVARIANT)
- **NO DIRECT `phimimg.com` ON CLIENT:** The domain `phimimg.com` is actively blocked / dropped by ISPs in Vietnam (VNPT, Viettel, FPT). NEVER pass raw `phimimg.com` URLs directly to client `<img>` tags.
- Always proactively upgrade movie posters to official TMDb CDN (`image.tmdb.org`) or non-phimimg sources.
- In `MediaCard` and all card components, never render empty black skeleton holes. Always keep the underlying Dynamic Typography Poster Canvas rendered so cards display the movie title, year, and genre even if an image is loading or fails.

# Website Inspection Guide

## How to Reverse-Engineer Any Website

This guide outlines what to capture when inspecting a target website via Chrome MCP or browser DevTools.

## Phase 1: Visual Audit

### Screenshots to Capture
- [ ] Every distinct page — desktop, tablet, mobile
- [ ] Dark mode variants (if applicable)
- [ ] Light mode variants (if applicable)
- [ ] Key interaction states (hover, active, open menus, modals)
- [ ] Loading/skeleton states
- [ ] Empty states
- [ ] Error states

### Design Tokens to Extract
- [ ] **Colors** — background, text (primary/secondary/muted), accent, border, hover, error, success, warning
- [ ] **Typography** — font family, sizes (h1-h6, body, caption, label), weights, line heights, letter spacing
- [ ] **Spacing** — padding/margin patterns (look for a scale: 4px, 8px, 12px, 16px, 24px, 32px, etc.)
- [ ] **Border radius** — buttons, cards, avatars, inputs
- [ ] **Shadows/elevation** — card shadows, dropdown shadows, modal overlay
- [ ] **Breakpoints** — when does the layout shift? (inspect with DevTools responsive mode)
- [ ] **Icons** — which icon library? custom SVGs? sizes?
- [ ] **Avatars** — sizes, shapes, fallback behavior
- [ ] **Buttons** — all variants (primary, secondary, ghost, icon-only, danger)
- [ ] **Inputs** — text fields, textareas, selects, checkboxes, toggles

## Phase 2: Component Inventory

For each distinct UI component, document:
1. **Name** — what would you call this component?
2. **Structure** — what HTML elements / child components does it contain?
3. **Variants** — does it have different sizes, colors, or states?
4. **States** — default, hover, active, disabled, loading, error, empty
5. **Responsive behavior** — how does it change at different breakpoints?
6. **Interactions** — click, hover, focus, keyboard navigation
7. **Animations** — transitions, entrance/exit animations, micro-interactions

### Common Components to Look For
- Navigation (top bar, sidebar, bottom bar)
- Cards / list items
- Buttons and links
- Forms and inputs
- Modals and dialogs
- Dropdowns and menus
- Tabs and segmented controls
- Avatars and user badges
- Loading skeletons
- Toast notifications
- Tooltips and popovers

## Phase 3: Layout Architecture

- [ ] **Grid system** — CSS Grid? Flexbox? Fixed widths?
- [ ] **Column layout** — how many columns at each breakpoint?
- [ ] **Max-width** — main content area max-width
- [ ] **Sticky elements** — header, sidebar, floating buttons
- [ ] **Z-index layers** — navigation, modals, tooltips, overlays
- [ ] **Scroll behavior** — infinite scroll, pagination, virtual scrolling

## Phase 4: Technical Stack Analysis

- [ ] **Framework** — React? Vue? Angular? Check `__NEXT_DATA__`, `__NUXT__`, `ng-version`
- [ ] **CSS approach** — Tailwind (utility classes), CSS Modules, Styled Components, Emotion, vanilla CSS
- [ ] **State management** — Redux (check DevTools), React Query, Zustand, Pinia
- [ ] **API patterns** — REST, GraphQL (check network tab for `/graphql` requests)
- [ ] **Font loading** — Google Fonts, self-hosted, system fonts
- [ ] **Image strategy** — CDN, lazy loading, srcset, WebP/AVIF
- [ ] **Animation library** — Framer Motion, GSAP, CSS transitions only

## Phase 5: Documentation Output

After inspection, create these files in `docs/research/`:
1. `DESIGN_TOKENS.md` — All extracted colors, typography, spacing
2. `COMPONENT_INVENTORY.md` — Every component with structure notes
3. `LAYOUT_ARCHITECTURE.md` — Page layouts, grid system, responsive behavior
4. `INTERACTION_PATTERNS.md` — Animations, transitions, hover states
5. `TECH_STACK_ANALYSIS.md` — What the site uses and our chosen equivalents

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

# PIXEL-PERFECT & DESIGN TASTE FRAMEWORK — NANAFLIX

Tài liệu này xác lập bộ tiêu chuẩn UI/UX và quy tắc kỹ thuật giao diện dùng lâu dài cho toàn bộ dự án Nanaflix, định hướng trải nghiệm streaming cao cấp (chuẩn Apple TV / Netflix).

---

## 1. Pixel-Perfect Layout

- **Alignment & Horizontal Baseline:** Các thành phần trong cùng một hàng hoặc cùng một lưới (Grid/Carousel) phải giữ căn thẳng hàng (alignment) tuyệt đối, không được xô lệch đáy hay so le tiêu đề.
- **Hệ thống khoảng cách (Spacing Grid):** Ưu tiên hệ spacing 4px/8px (các bước: 2px, 4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px). Không ép buộc máy móc nếu thiết kế hoặc typography hiện tại có lý do hợp lý cần khoảng đệm đặc thù.
- **Phòng chống Overflow & Layout Shift:**
  - Tuyệt đối không để phát sinh thanh cuộn ngang ngoài ý muốn trên toàn trang (`overflow-x: hidden` có chủ đích hoặc container co giãn an toàn).
  - Khung ảnh poster, thumbnail video bắt buộc có tỷ lệ khung hình xác định trước (`aspect-[2/3]`, `aspect-video`) kèm màu nền placeholder để tránh giật khung hình (CLS - Cumulative Layout Shift) khi ảnh đang tải.
- **Responsive Viewport Testing:** Kiểm tra tối thiểu từ viewport nhỏ (320px, 375px, 390px), trung bình (640px, 768px, 1024px) đến lớn (1280px+).
- **Nguyên tắc bảo toàn kích thước:** Không tùy tiện thay đổi kích thước, độ rộng card nếu chưa đánh giá toàn diện ảnh hưởng đến mật độ hiển thị và trải nghiệm cuộn của trang.

---

## 2. Typography & Xử Lý Chữ Tiếng Việt

- **Phân cấp thị giác rõ rệt (Typographic Hierarchy):**
  - Giữ khoảng cách chênh lệch tối thiểu 2–3px giữa các cấp chữ cạnh nhau (ví dụ: Tiêu đề 13–14px semibold sáng màu; Thông tin phụ 11px medium xám dịu).
  - Tránh để hai cấp chữ liền kề có kích cỡ xấp xỉ nhau (như 13px và 12px) gây cảm giác tranh chấp không gian và chật chội.
- **An toàn dấu tiếng Việt (Diacritics Safety):**
  - Tiêu đề nhiều dòng tiếng Việt bắt buộc có `line-height` tối thiểu `leading-[1.4]` (hoặc `leading-snug`).
  - Khi cố định chiều cao (`h-*`), bắt buộc tính toán: `Chiều cao = (Cỡ font × line-height × số dòng) + khoảng đệm dấu thanh`. Tuyệt đối không ép chiều cao quá sát khiến dấu mũ (`ấ, ế, ố, ứ`) hoặc dấu nặng/hỏi bị `overflow: hidden` xén mất.
- **Kỷ luật Truncation & Flexbox:**
  - Mọi container flexbox/grid chứa nội dung text động bắt buộc phải có `min-w-0` để ngăn flex child bung quá chiều rộng cha.
  - Sử dụng `line-clamp-*` khi giới hạn số dòng (kèm container `min-w-0`).
  - Chỉ dùng `truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`) khi giới hạn đúng 1 dòng.
  - Không mặc định `display: flex` luôn làm hỏng ellipsis; phải kiểm tra xem text node nằm trực tiếp trong flex container hay nằm trong flex item có `min-w-0`. Nếu phần tử cha là flex container không có `min-w-0`, chuyển sang `block truncate` hoặc bọc text vào flex item con có `min-w-0`.
- **Độ tương phản (Contrast):** Không hạ màu chữ metadata quá mức (giữ tối thiểu mức `text-zinc-400/90` hoặc `text-neutral-400` trên nền tối) để bảo đảm khả năng đọc rõ ràng theo chuẩn tiếp cận WCAG.

---

## 3. Spacing & Component Consistency

- **Khoảng thở có chủ đích (Intentional Spacing):**
  - Khoảng cách giữa hình ảnh (poster) và tiêu đề: 8–10px (`pt-2` hoặc `pt-2.5`).
  - Khoảng cách giữa tiêu đề và thông tin phụ: 4–6px (`mt-1` hoặc `mt-1.5`).
- **Chiều cao cố định có kiểm soát:**
  - Chỉ cố định chiều cao vùng tiêu đề khi các card nằm trong cùng một hàng/grid ngang cần giữ thẳng tắp đường chân trời cho dòng metadata bên dưới.
  - Không áp đặt cấu trúc cứng nhắc giống nhau cho các component có bản chất khác nhau (ví dụ: thẻ phim chân dung `MediaCard` khác với thẻ lịch thi đấu `MatchCard`).

---

## 4. Dark Theme & Vật Liệu Giao Diện

- **Tôn trọng Design System:** Sử dụng bảng màu gốc của Nanaflix (nền đen điện ảnh, đỏ thương hiệu `netflix-red`, điểm nhấn vàng hổ phách `amber-400`).
- **Chiều sâu bề mặt (Layered Dark Surfaces):**
  - Tránh lạm dụng màu đen tuyền `#000000` cho mọi bề mặt card và modal.
  - Ưu tiên cấu trúc phân lớp: Nền trang (`bg-zinc-950` / `bg-black`) ➔ Nền card (`bg-zinc-900/80` hoặc `from-zinc-800/70 via-zinc-900 to-zinc-950`) ➔ Lớp nổi / Dropdown (`bg-zinc-900/95 backdrop-blur-md`).
- **Đường viền siêu mảnh (Hairline Borders):** Sử dụng `border border-white/10` (hover: `border-white/25`) để định hình ranh giới mà không gây thô cứng.
- **Glassmorphism có chọn lọc:** Áp dụng `backdrop-blur-md` kết hợp `bg-black/60` cho các huy hiệu (badge chất lượng, rating, nút hành động nổi) để làm nổi bật thông tin trên nền poster ảnh động.

---

## 5. Motion & Tương Tác

- **Đường cong chuyển động:** Áp dụng easing mượt mà `transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`.
- **Hover Scale tinh tế:** Card chỉ phóng to nhẹ (`scale-[1.02]` đến `scale-[1.03]`), tuyệt đối không scale quá lớn (`> 1.05`) gây che khuất nội dung card lân cận.
- **Khả năng tiếp cận (Accessibility):**
  - Luôn hỗ trợ `motion-reduce:transform-none` cho người dùng nhạy cảm chuyển động.
  - Không phụ thuộc vào hover cho các chức năng cốt lõi (trên mobile/tablet phải có nút bấm chạm trực tiếp hoặc thao tác tap).
  - Giữ nguyên trạng thái `focus-visible` phục vụ điều hướng bằng bàn phím.

---

## 6. Quy Trình Khi AI Agent Chỉnh Sửa UI

Mọi AI Agent khi thực hiện tác vụ sửa đổi giao diện trên Nanaflix bắt buộc tuân thủ 2 bước:

### Trước khi sửa:
1. Xác định chính xác component và mọi nơi đang tái sử dụng component đó.
2. Kiểm tra code thực tế, không dựa vào suy đoán hoặc quy tắc giả định.
3. Xác định phạm vi thay đổi tối thiểu cần thiết để đạt mục tiêu, không refactor lan man.

### Sau khi sửa:
1. Kiểm tra responsive ở các breakpoint liên quan (đặc biệt là 320px, 375px, 390px trên mobile và 768px, 1280px trên desktop).
2. Kiểm tra regression: đảm bảo không làm thay đổi logic dữ liệu, tương tác, hoặc làm vỡ bố cục các trang khác.
3. Chạy kiểm tra kỹ thuật của dự án: `npm run typecheck`, unit test liên quan.
4. Báo cáo trung thực những gì đã kiểm chứng và giới hạn kiểm thử (nếu có).

---

## 7. Engineering Quality Gate: Lint, TypeScript & Regression Rules

Bộ quy chuẩn kỹ thuật bắt buộc nhằm triệt tiêu lỗi ESLint, TypeScript, React Hooks và ngăn ngừa hồi quy logic trong mọi phiên làm việc:

### A. Bắt Buộc Kiểm Tra Trước Khi Kết Thúc
- **Script lint chính thức:** Bắt buộc chạy `npm run lint` trước khi hoàn tất công việc.
- **Typecheck nghiêm ngặt:** Bắt buộc chạy `npm run typecheck` (`tsc --noEmit`).
- **Unit & Regression Test:** Chạy các test liên quan trực tiếp đến khu vực vừa sửa đổi (ví dụ: `npm run test:history`, `npm run test:live`, `npm run test:movies`, v.v.).
- **Build & Verification:** Chạy build (`npm run build`) hoặc regression/browser test khi mức độ thay đổi cấu trúc/trang yêu cầu.
- **Tính trung thực:** Tuyệt đối không tuyên bố PASS nếu lệnh chưa thực sự chạy thành công hoặc bị lỗi/timeout.
- **Đề xuất hợp lý:** Nếu dự án chưa có lệnh lint, đề xuất cách bổ sung phù hợp với cấu hình hiện tại; không tự ý cài thêm package hoặc thay đổi lớn cấu hình ngoài phạm vi.

### B. Quy Tắc Code & Ngăn Ngừa Lỗi React
- **Không để lại lỗi mới:** Không để lại bất kỳ lỗi lint mới, lỗi TypeScript compiler hoặc vi phạm quy tắc React Hooks (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react-hooks/refs`).
- **Dependencies của Hooks:** Tuyệt đối không bỏ qua dependency của `useEffect`, `useMemo`, `useCallback` chỉ để làm lint im lặng mà không có phân tích kỹ thuật.
- **Cấm che giấu lỗi:** Không tùy tiện sử dụng `eslint-disable`, `@ts-ignore`, `@ts-nocheck` hoặc ép kiểu `any` để che lỗi nếu chưa có lý do kỹ thuật rõ ràng và được giải thích minh bạch.
- **Vệ sinh mã nguồn:** Loại bỏ triệt để unused imports, unused variables, unreachable code, biến bị khai báo lại và các biểu thức điều kiện luôn đúng/sai.
- **Xử lý bất đồng bộ & Vòng đời:** Xử lý đầy đủ Promise rejection, async error; dọn dẹp sạch sẽ (cleanup) mọi event listener, interval, timeout theo đúng vòng đời component để tránh rò rỉ bộ nhớ.
- **Player, Seek, Cache & Ad Transition:** Đặc biệt cẩn trọng với trình phát: triệt tiêu race condition, stale closure, timer bị bỏ quên, và các chuyển đổi trạng thái (state transition) không có điểm kết thúc an toàn.
- **Không hạ chuẩn lỏng lẻo:** Không thêm suppression toàn file (`/* eslint-disable */`) hoặc hạ thấp mức nghiêm trọng của quy tắc trong file cấu hình chỉ để vượt qua kiểm tra.

### C. Giới Hạn Phạm Vi Sửa Đổi
- **Tập trung & tối thiểu:** Không tự tiện format lại toàn bộ file hoặc sửa hàng loạt các file không liên quan đến mục tiêu yêu cầu.
- **Bảo toàn nghiệp vụ:** Tuyệt đối không thay đổi business logic chỉ nhằm mục đích làm lint pass.
- **Giữ nguyên cấu hình:** Không nâng cấp dependency, không thay đổi cấu hình ESLint toàn cục hoặc can thiệp lockfile nếu không có yêu cầu rõ ràng.
- **Bóc tách baseline:** Nếu baseline tồn tại lỗi cũ từ trước, ghi rõ nội dung lỗi, vị trí và trạng thái trước/sau; không nhận lỗi cũ là lỗi do patch mới và ngược lại.
- **Chỉ xử lý phạm vi được giao:** Chỉ sửa các lỗi mới do thay đổi hiện tại gây ra, trừ khi được người dùng phê duyệt sửa mở rộng.

### D. Quy Trình Kiểm Tra Sau Mỗi Patch
1. **Linting:** Chạy `npm run lint` trên phạm vi file sửa đổi hoặc toàn dự án.
2. **Typecheck:** Chạy `npm run typecheck` để đảm bảo hệ thống kiểu dữ liệu không bị gãy vỡ.
3. **Targeted Test:** Chạy các unit/regression test liên quan đến module vừa can thiệp.
4. **Diff Inspection:** Soát kỹ `git diff` để phát hiện sửa sót ngoài phạm vi, phát hiện suppression mới và ngăn ngừa thay đổi cấu hình ngoài ý muốn.
5. **Browser Regression:** Với các thay đổi liên quan đến UI/Player/Animation, kiểm tra hành vi thực tế hoặc chạy kịch bản browser regression phù hợp.

# Craft floor

Load this after the direction is settled, and build without announcing the checklist. A pinned brief or the committed visual world overrides anything here except a line marked as a ban; your own habit does not. When the design hook is active it already enforces the mechanical checks below as you edit: act on its findings instead of re-auditing each rule.

## Verify

Each of these is a check on the built result, not an intention. Run them together in each batched look at the render, not as separate screenshot trips; the checks share one render.

- **Contrast:** body and placeholder text ≥4.5:1, large text ≥3:1. On colored surfaces tint secondary text from that hue or the foreground; never gray.
- **Depth:** shadows carry an offset and a soft blur. A zero-offset colored halo is decoration.
- **Spacing:** tight groups, generous separation, more space above a heading than below it. Read the computed values.
- **Type:** body measure 65–75ch, display max 6rem, tracking floor -0.04em, balanced headings, obvious scale and weight steps. Run the real copy at every breakpoint and fix what overflows.
- **Motion:** one authored moment, not scattered effects and not one identical entrance on every section. Exponential ease-out from an already-visible default. Reach past transform and opacity: blur, backdrop-filter, clip-path, mask, and shadow belong to the palette when they stay smooth.
- **States:** hover, disabled, loading, error, empty. Plus real content, working controls, responsive composition, keyboard focus.
- **Browser surfaces:** the parts you did not draw still carry the design. Text selection, the caret, custom scrollbars, focus rings, underline offset, and the numerals in tabular data all ship with browser defaults that belong to no design system. Theme them from the palette. This is the cheapest signal that a page was built rather than assembled, and the one models skip most reliably.
- **Copy:** the product's own language. Controls name their action; errors name the problem and the recovery.
- **Coverage:** every brief requirement present and findable within seconds.

## Refuse

These are the category's defaults, not bans: the brief's own words can earn any of them. Reaching for one when the axis is free means you were not deciding; recognizing that means rewriting the element, not softening it.

Page scaffolds:

- Same-size cards of icon plus heading plus text as the page structure. Cards are the lazy container; nested cards are always wrong.
- The hero-metric template: big number, small label, supporting stats, accent.
- A kicker or eyebrow above a heading. This one is a ban, not a default: no brief earns it back. The heading carries its own weight; delete the label and let the heading speak.
- Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs.
- A modal for a task that needs neither interruption nor protected focus.

Surface habits:

- Gradient text. Emphasis comes from weight or size.
- Glass and blur as decoration rather than as a specific effect.
- A colored `border-left` or `border-right` above 1px on cards, list items, callouts, or alerts.
- Hard offset shadows (`box-shadow: 4px 4px 0`) outside a world that is actually neobrutalist. The zero-blur block shadow is a costume, not a depth system; a world that did not choose it never earns it as a default.
- Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content.
- Monospace as a costume for "technical" rather than for code, data, or measurement.
- A system display face (Impact, Arial Black, the platform sans) as the display voice of an own-world page. Source and self-host a face whose character matches the approved lettering; the closest installed font is a failure, not a fallback.
- Unicode glyphs or emoji standing in for an icon system. Icons are drawn, from a real library or authored SVG, in one consistent stroke and weight.
- Geometric masks standing in for organic contours. A circle, polygon, or radial-gradient cutout approximating a photographic subject's edge is the cheap version of the effect and reads worse than omitting it. Derive an alpha matte from the actual image, or produce a cut-out asset.
- Light or dark picked by category. Pick it from the use scene: who, where, under what ambient light.

- Tracking stops at -0.04em. -0.02 to -0.03em usually reads better.
- Declare elevation once, border or shadow. A 1px border under a wide soft shadow is the ghost card. Card radii stay at 12–16px; pills are for small controls.
- Real illustration or none. Sketch-style SVG scenes, `loose-sketch` / `doodle` class names, and `feTurbulence` grain read as amateur. This bans SVG imitating pictures, never SVG doing geometry: crisp vector shapes, diagrams, animated linework, and shader-driven effects remain first-class media. A shaded, perspectived, or figure-bearing illustration is a picture even in line-art style; geometry means shapes a session can specify exactly.
- Backgrounds are surfaces, textured only from the subject's world. `repeating-linear-gradient` stripes and two-axis grid overlays need an actual canvas, map, blueprint, or measuring tool under them.
- Claims and configuration come from supplied truth; label illustrative values honestly. Naming a concept and then ironizing it is not a claim.

The floor holds the mechanics; it never picks the direction. With every check green, spend the page on the committed world, and when torn between refined and committed, commit.
