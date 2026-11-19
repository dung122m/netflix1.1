<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

# Project Rules (Nanaflix / Next.js 16)

## Stack & Execution Discipline
- **Framework:** Next.js 16 (App Router, ưu tiên Server Components, chỉ dùng `'use client'` khi cần state/event; React 19, TypeScript strict, no `any`), shadcn/ui, Tailwind CSS v4, Lucide React, deployed on Vercel.
- **Reuse-First:** Always inspect `src/lib/`, `src/services/`, and `src/components/` before creating new files or utilities. Keep diffs minimal and cohesive.
- **Conventions:** Named exports, PascalCase components, camelCase utils, mobile-first Tailwind classes (no inline styles), 2-space indentation.
- **Commands:** `npm run dev` | `npm run build` | `npm run lint` | `npm run typecheck` | `npm run check`.

## Anti-Slop UI & Design Principles (STRICT)
- **Zero AI Slop:** Strictly forbid generic SaaS/AI landing-page patterns (symmetric 3-column feature grids, fake stats, fluffy marketing copy, purple/indigo neon glows, or decorative gradients). Match existing `src/components/` patterns and spacing.
- **Clean Surfaces & Borders:** Use solid, layered dark surfaces, typography, and subtle shadows (Apple TV+ / Netflix style). Forbid nested borders or bordered boxes/badges around icons. Reserve 1px borders strictly for inputs, focus/active states, and essential dividers.
- **Clean Text & Actions:** Never prepend decorative icons to headings, labels, or body text unless functionally required (e.g., Play/Search buttons). Avoid scattered or redundant buttons.
- **Typography:** Strictly forbidden to use `font-mono` on UI (scores, numbers, clocks, minutes) due to poor rendering on Windows; always use `font-sans tabular-nums` for aligned numbers.

## Zero-Hardcode & Data Integrity (STRICT)
- **NO MOCK / HARDCODED DATA FILES:** Strictly forbidden to create mock files, `SEED_*`, `DUMMY_*`, or hardcoded arrays of movies, channels, or users. All UI data MUST come from real project services (Supabase, `/api/*`, TMDb/AniList). If data is empty or fails, render a clean empty/error state—never fake data to fill the screen.

## Media, Image CDN & Cost Guard (STRICT)
- **NO DIRECT `phimimg.com` HOẶC `nguonc.com` TRÊN CLIENT:** Nguồn `phimimg.com` bị chặn ISP VN, còn `nguonc.com` (`img.nguonc.com`) có dung lượng ảnh gốc rất nặng (350KB-1MB+ không nén) gây nghẽn băng thông mobile. TUYỆT ĐỐI không nạp ảnh trực tiếp từ `phimimg.com` và `nguonc.com` lên thẻ `<img>` phía client; luôn chủ động nâng cấp poster sang TMDb CDN chính hãng (`image.tmdb.org`) hoặc bọc qua proxy CDN `/api/media/r2-proxy`.
- **Card Fallback:** In `MediaCard` and card components, never render empty black skeleton holes; keep the Dynamic Typography Poster Canvas rendered so title, year, and genre remain visible while loading or on error.
- **Vercel & Cloudflare R2 Optimization:** Prioritize Edge/ISR caching, avoid redundant client-side fetch/probe loops or unnecessary R2 uploads.