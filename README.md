<div align="center">

<img src="docs/screenshots/banner.png" alt="Nanaflix Banner" width="100%" style="border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);" />

<br /><br />

# 🎬 NANAFLIX - NEXT-GEN STREAMING PLATFORM

### *Nền tảng Xem Phim & Trực Tiếp Bóng Đá / Truyền Hình TV Trực Tuyến Đỉnh Cao*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_Powered-EA4335?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<br />

[✨ Tính Năng](#-tính-năng-nổi-bật) • [📸 Giao Diện](#-hình-ảnh-giao-diện-thực-tế) • [🛠️ Công Nghệ](#️-công-nghệ-sử-dụng) • [🚀 Cài Đặt](#-hướng-dẫn-cài-đặt--chạy-dự-án) • [⌨️ Phím Tắt](#️-bảng-phím-tắt-tiện-ích)

</div>

---

## 🌟 Giới Thiệu

**NANAFLIX** là ứng dụng web giải trí đa phương tiện thế hệ mới được xây dựng trên nền tảng **Next.js 16 (App Router)** và **React 19**. Ứng dụng mang đến trải nghiệm điện ảnh chuẩn rạp ngay trên trình duyệt, kết hợp trí tuệ nhân tạo **Google Gemini AI**, tính năng **điều khiển bằng giọng nói tiếng Việt**, cùng hệ thống phát trực tiếp **Bóng đá đỉnh cao** và hơn **100+ kênh truyền hình TV** chuẩn Full HD độ trễ cực thấp (*Ultra Low Latency*).

---

## ✨ Tính Năng Nổi Bật

### 🤖 1. Trợ Lý Điện Ảnh AI Thông Minh (Google Gemini AI)
- **Nana AI Movie Concierge**: Trò chuyện tự nhiên, tư vấn phim theo tâm trạng, sở thích, cốt truyện hoặc diễn viên yêu thích.
- **Nana AI Roulette**: Vòng quay may mắn gợi ý phim ngẫu nhiên khi bạn chưa biết xem gì hôm nay.
- **Tóm tắt cốt truyện thông minh**: AI tự động trích xuất điểm nhấn, thông điệp và đánh giá phim súc tích.

### 🎙️ 2. Điều Khiển Bằng Giọng Nói (AI Voice Assistant)
- Tích hợp chuẩn **Web Speech API** với bộ lọc tiếng Việt chuẩn xác.
- Nhận diện tức thì các câu lệnh tự nhiên:
  - *"Tìm phim hành động Hàn Quốc"*
  - *"Mở phim Squid Game"*
  - *"Xem trực tiếp bóng đá"*
  - *"Bật kênh VTV3"*
- Hỗ trợ phản hồi bằng giọng nói tiếng Việt mượt mà, tự nhiên.

### 🍿 3. Kho Phim Kép Đồ Sộ (Dual Aggregator Engine)
- Tích hợp đồng thời 2 nguồn phim hàng đầu: **KKPhim** và **VSMOV**.
- Thuật toán **khử trùng lặp thông minh (Deduplication)**: Tự động gộp phim cùng tên và gom nguồn phát chất lượng cao nhất.
- Bộ lọc đa chiều: Lọc chuẩn xác theo **Loại phim** (Phim lẻ, Phim bộ, Hoạt hình, TV Shows), **Thể loại**, **Quốc gia**, **Năm phát hành** và **Sắp xếp**.

### ⚽ 4. Trực Tiếp Bóng Đá HD Có BLV Tiếng Việt
- Tổng hợp các trận đấu hấp dẫn từ Ngoại Hạng Anh, Cúp C1 Champions League, La Liga, Serie A, Bundesliga, V-League, MLS, Saudi League...
- Bình luận viên tiếng Việt sôi động từ **Xôi Lạc, Cola TV, Gà Vàng, S8 TV, Cà Khịa TV**.
- Phân luồng thời gian thực: Đang đá (`LIVE`), Sắp diễn ra (`2h tới`), hoặc Toàn bộ lịch thi đấu.
- Tính năng **Hẹn giờ nhắc trận đấu (Match Reminder)**: Đặt lịch và nhận thông báo trước giờ bóng lăn.

### 📺 5. Truyền Hình TV Trực Tuyến 100+ Kênh Chuẩn FHD
- Danh mục đa dạng: **Kênh VTV (VTV1 - VTV9), Kênh HTV/HTVC, Truyền hình Vĩnh Long (THVL), Kênh Thể Thao, Kênh Quốc Tế (Red Bull TV, NASA TV, NHK World)**.
- Logo đài truyền hình chuẩn SVG vector sắc nét.
- Hoạt ảnh sóng âm **Equalizer** nhảy theo nhịp kênh đang phát sóng.
- Dải kênh phổ biến **Quick Access Bar**: Chuyển kênh tức thì với 1-chạm.

### 🎭 6. Trình Phát Rạp Phim (Cinema Player) Vừa Khung Nhìn
- **Thiết kế tối ưu Viewport**: Vừa vặn 100% trong khung hình màn hình, người dùng có thể điều khiển Play/Pause, Âm lượng, Chọn tập mà **không cần phải cuộn/lăn chuột**.
- **Chế độ Rạp phim (Theater Mode)** & **Tắt đèn (Lights Off)** cho trải nghiệm xem đắm chìm.
- **Hẹn giờ tắt phim thông minh (Sleep Timer)**: Tự động dừng phát sau 15p, 30p, 45p, 60p hoặc khi hết tập.
- **Thu nhỏ góc màn hình (Picture-in-Picture)** & Mini Floating Player khi cuộn trang.
- **Tự động lưu lịch sử xem & Xem tiếp (Continue Watching)**.

---

## 📸 Hình Ảnh Giao Diện Thực Tế

<div align="center">

### 🎬 Trình Phát Phim Rạp Chiếu Đỉnh Cao
<img src="docs/screenshots/cinema-player.png" alt="Cinema Player" width="95%" style="border-radius: 12px; margin-bottom: 20px;" />

### 🌐 Kho Phim & Bộ Lọc Đa Nguồn Chuyên Sâu
<img src="docs/screenshots/browse-catalog.png" alt="Browse Catalog" width="95%" style="border-radius: 12px; margin-bottom: 20px;" />

### 🎙️ Trợ Lý Điều Khiển Bằng Giọng Nói & Tương Tác AI
<img src="docs/screenshots/ai-voice.png" alt="AI Voice Controller" width="95%" style="border-radius: 12px;" />

</div>

---

## 🛠️ Công Nghệ Sử Dụng

| Lĩnh Vực | Công Nghệ / Thư Viện |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Ngôn Ngữ** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Variables Tokens + Glassmorphism |
| **Icons & Hoạt Ảnh** | [Lucide React](https://lucide.dev/) + Framer Motion |
| **AI Integration** | [Google Gemini 1.5 Flash API](https://ai.google.dev/) (`@google/genai`) |
| **Voice Engine** | Web Speech API (SpeechRecognition & SpeechSynthesis Native TTS) |
| **Video Stream** | [HLS.js](https://github.com/video-dev/hls.js) (Ultra Low Latency Engine) + Proxy Stream |
| **Data Sources** | KKPhim API, VSMOV API, Vietnam IPTV M3U, Live Sports Stream |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu Cầu Môi Trường
- [Node.js](https://nodejs.org/) phiên bản **18.18+** hoặc **20+**
- Trình quản lý gói `npm` hoặc `pnpm` / `yarn`

### 2. Tải Mã Nguồn & Cài Đặt Thư Viện
```bash
# Clone repository
git clone https://github.com/dung122m/netflix1.1.git

# Di chuyển vào thư mục dự án
cd netflix1.1

# Cài đặt các dependencies
npm install
```

### 3. Cấu Hình Biến Môi Trường (`.env.local`)
Tạo file `.env.local` ở thư mục gốc và cấu hình API Key của Google Gemini:

```env
# Google Gemini AI API Key (Lấy miễn phí tại https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# (Tùy chọn) Next.js Public Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Khởi Chạy Server Phát Triển (Development)
```bash
npm run dev
```
Mở trình duyệt và truy cập: **`http://localhost:3000`**

### 5. Kiểm Tra Chất Lượng Mã Nguồn & Build
```bash
# Kiểm tra Type Safety
npm run typecheck

# Kiểm tra Linter
npm run lint

# Build bản Production
npm run build
```

---

## ⌨️ Bảng Phím Tắt Tiện Ích

### 🎬 Trình Phát Phim (Cinema Player):
| Phím Tắt | Chức Năng |
| :---: | :--- |
| `Space` | Tạm dừng / Tiếp tục phát video |
| `F` | Bật / Thoát chế độ Toàn màn hình (*Fullscreen*) |
| `T` | Bật / Tắt chế độ Rạp phim (*Theater Mode*) |
| `L` | Bật / Tắt đèn nền (*Lights Off*) |
| `P` | Chuyển về tập phim trước |
| `N` | Chuyển sang tập phim kế tiếp |
| `?` | Mở bảng hướng dẫn phím tắt |
| `Esc` | Thoát chế độ Rạp phim / Bật lại đèn |

### ⚽ Trình Phát Bóng Đá & 📺 Truyền Hình TV:
| Phím Tắt | Chức Năng |
| :---: | :--- |
| `Space` | Dừng / Phát luồng trực tiếp |
| `M` | Bật / Tắt âm thanh (*Mute/Unmute*) |
| `F` | Bật / Thoát toàn màn hình |
| `P` | Xem thu nhỏ góc màn hình (*Picture-in-Picture*) |
| `↑` / `↓` | Tăng / Giảm âm lượng 10% |
| `←` / `→` | **Chuyển máy chủ phát** *(Bóng đá)* hoặc **Lướt kênh trước / sau** *(Live TV)* |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```plaintext
netflix1.1/
├── src/
│   ├── app/                    # Next.js App Router Pages & API Routes
│   │   ├── api/                # API Routes (Gemini AI, Voice, Live Proxy, Match)
│   │   ├── browse/             # Trang Khám phá & Lọc phim nâng cao
│   │   ├── live/               # Trang Trực tiếp Bóng đá & Truyền hình TV
│   │   ├── movies/[slug]/      # Trang Chi tiết phim & Trình phát rạp chiếu
│   │   ├── my-list/            # Danh sách phim yêu thích & Lịch sử xem
│   │   ├── globals.css         # CSS Tokens, Ambient Light & Theme System
│   │   └── page.tsx            # Trang chủ Nanaflix Home Page
│   ├── components/             # React UI Components
│   │   ├── live/               # LivePlayer, LiveFootballClient, LiveTvClient
│   │   ├── CinemaPlayer.tsx    # Trình phát phim rạp chuyên nghiệp
│   │   ├── VoiceController.tsx # Trợ lý điều khiển bằng giọng nói
│   │   ├── AiConcierge.tsx     # Chatbot tư vấn phim Gemini AI
│   │   └── Navbar.tsx          # Thanh điều hướng chuẩn Netflix
│   ├── services/               # Data Fetching & API Aggregators
│   │   ├── kkphimService.ts    # KKPhim API Client
│   │   ├── vsmovService.ts     # VSMOV API Client
│   │   ├── liveFootballService.ts # Live Football M3U Parser & Dedup
│   │   └── liveTvService.ts    # Live TV Channels & Official SVG Logos
│   └── hooks/                  # Custom React Hooks
├── public/                     # Static Assets, SVGs, Favicons
├── docs/screenshots/           # Screenshots & Banners giới thiệu
├── README.md                   # Tài liệu dự án
└── package.json
```

---

## 📄 Bản Quyền & Giấy Phép

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**.

<div align="center">
  <sub>Được phát triển với niềm đam mê điện ảnh và công nghệ bởi <strong>NANAFLIX Team</strong> ❤️</sub>
</div>
