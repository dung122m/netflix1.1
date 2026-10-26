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
