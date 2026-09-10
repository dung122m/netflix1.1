<div align="center">

<img src="docs/screenshots/banner.png" alt="Nanaflix Hero Banner" width="100%" style="border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);" />

<br /><br />

# 🎬 NANAFLIX - NEXT-GEN STREAMING PLATFORM

### *The Ultimate AI-Powered Cinema Experience, Live Sports & IPTV Streaming Web Application*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-AI_Powered-EA4335?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<br />

[✨ Features](#-key-features) • [📸 Screenshots](#-visual-showcase) • [🛠️ Tech Stack](#️-tech-stack--architecture) • [🚀 Quick Start](#-quick-start--installation) • [⌨️ Shortcuts](#️-keyboard-shortcuts)

</div>

---

## 🌟 Overview

**NANAFLIX** is a state-of-the-art, high-performance multimedia streaming web application crafted with **Next.js 16 (App Router)** and **React 19**. 

Designed with modern dark-cinema aesthetics and glassmorphism UI, NANAFLIX integrates **Google Gemini AI** for intelligent movie recommendations, **Web Speech API** for hands-free voice control, a **Dual API Aggregator** combining 40,000+ movies & TV shows, and an **Ultra Low Latency HLS Engine** for live sports football and 100+ national/international IPTV channels.

---

## ✨ Key Features

### 🤖 1. AI Movie Concierge (Google Gemini AI)
- **Nana AI Assistant**: Natural language conversational agent powered by Gemini 1.5 Flash. Ask for recommendations by mood, plot twists, actor names, or genre combinations.
- **Nana AI Roulette**: Spin the wheel to get instant, smart movie suggestions when you're undecided.
- **Smart Synopses & Themes**: AI-generated movie highlights, themes, and key takeaways.

### 🎙️ 2. Intelligent Voice Control (Web Speech API)
- Real-time Vietnamese voice recognition with native Speech-to-Text & Text-to-Speech feedback.
- Hands-free navigation with commands such as:
  - *"Search for action movies"*
  - *"Open Squid Game"*
  - *"Watch live football"*
  - *"Switch to VTV3"*

### 🍿 3. Dual Source Aggregator (40,000+ Titles)
- Unified catalog streaming from **KKPhim** and **VSMOV** APIs.
- **Smart Deduplication**: Automatically merges duplicate movie titles across providers and prioritizes the highest resolution stream.
- **Multi-Dimensional Filter**: Seamlessly filter by Movie Type (Single Movies, TV Series, Anime, TV Shows), Genre, Country, Year, and Sorting criteria.

### ⚽ 4. Live Football with Vietnamese Commentary
- Comprehensive schedule covering Premier League, UEFA Champions League, La Liga, Serie A, Bundesliga, V-League, MLS, Saudi Pro League, and more.
- Native commentary feeds from popular broadcasters (Xôi Lạc, Cola TV, Gà Vàng, S8 TV, Cà Khịa TV...).
- Timeline tabs: Real-time Live matches (`LIVE`), Upcoming fixtures (`Next 2h`), and Full calendar.
- **Match Reminder Modal**: Schedule reminders and never miss kick-off.

### 📺 5. Live IPTV Streaming (100+ Channels in FHD)
- Wide channel selection: **National TV (VTV1 - VTV9), Regional (HTV, THVL), Sports Channels, and International (Red Bull TV, NASA TV, NHK World)**.
- Official vector SVG channel badges with active neon equalizer animations.
- **Quick Access Row**: 1-click channel switcher for popular favorites.

### 🎭 6. Viewport-Fitted Cinema Player
- **Zero-Scroll Viewport Design**: The entire video player, scoreboard/header, and bottom controls fit 100% within the visible screen height on any device.
- **Theater Mode & Lights Off**: Dim ambient background lighting for an immersive theater experience.
- **Sleep Timer**: Automatically pause playback after 15, 30, 45, 60 minutes or at the end of the episode.
- **Picture-in-Picture (PiP)** & Floating Mini Player when scrolling down.
- **Continue Watching**: Persistent local watch history and progress tracking.

---

## 📸 Visual Showcase

<div align="center">

### 🎬 Cinema Player with Viewport Fitting
<img src="docs/screenshots/cinema-player.png" alt="Cinema Player" width="95%" style="border-radius: 12px; margin-bottom: 20px;" />

### 🌐 Dual Catalog & Multi-Filter System
<img src="docs/screenshots/browse-catalog.png" alt="Browse Catalog" width="95%" style="border-radius: 12px; margin-bottom: 20px;" />

### 🎙️ AI Voice Controller & Smart Assistant
<img src="docs/screenshots/ai-voice.png" alt="AI Voice Controller" width="95%" style="border-radius: 12px;" />

</div>

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Variables + Glassmorphism + Ambient Glow |
| **Icons & Motion** | [Lucide React](https://lucide.dev/) + Framer Motion |
| **Generative AI** | [Google Gemini 1.5 Flash API](https://ai.google.dev/) (`@google/genai`) |
| **Voice Processing** | Web Speech API (SpeechRecognition + Web SpeechSynthesis Native TTS) |
| **Media Player** | [HLS.js](https://github.com/video-dev/hls.js) (Ultra Low Latency + Auto-Recovery Engine) + Stream Proxy |
| **Data APIs** | KKPhim API, VSMOV API, Vietnam IPTV M3U, Live Sports Stream M3U |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) version **18.18+** or **20+**
- Package manager: `npm`, `pnpm`, or `yarn`

### 2. Clone Repository & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/dung122m/netflix1.1.git

# Navigate to project directory
cd netflix1.1

# Install dependencies
npm install
```

### 3. Environment Variables Configuration
Create a `.env.local` file in the project root:

```env
# Google Gemini AI API Key (Get a free key at https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# (Optional) Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:3000`**

### 5. Code Quality & Production Build
```bash
# Run TypeScript typecheck
npm run typecheck

# Run ESLint validation
npm run lint

# Build production bundle
npm run build
```

---

## ⌨️ Keyboard Shortcuts

### 🎬 Cinema Movie Player:
| Shortcut | Action |
| :---: | :--- |
| `Space` | Play / Pause video |
| `F` | Toggle Fullscreen |
| `T` | Toggle Theater Mode |
| `L` | Toggle Lights Off mode |
| `P` | Previous episode |
| `N` | Next episode |
| `?` | Open keyboard shortcuts modal |
| `Esc` | Exit Theater mode / Turn lights on |

### ⚽ Live Football & 📺 Live TV:
| Shortcut | Action |
| :---: | :--- |
| `Space` | Play / Pause live stream |
| `M` | Mute / Unmute audio |
| `F` | Toggle Fullscreen |
| `P` | Picture-in-Picture (PiP) |
| `↑` / `↓` | Volume Up / Down (10% step) |
| `←` / `→` | **Switch Stream Server** *(Football)* or **Channel Surfing** *(Live TV)* |

---

## 📁 Project Structure

```plaintext
netflix1.1/
├── src/
│   ├── app/                    # Next.js App Router Pages & API Routes
│   │   ├── api/                # Backend API Routes (Gemini AI, Voice, Live Proxy, Match)
│   │   ├── browse/             # Browse & Advanced Multi-Filter Catalog
│   │   ├── live/               # Live Sports (Football) & IPTV Live Channels
│   │   ├── movies/[slug]/      # Movie Detail & Cinema Player page
│   │   ├── my-list/            # Watchlist & Continue Watching history
│   │   ├── globals.css         # CSS Tokens, Theme System & Animations
│   │   └── page.tsx            # Main Homepage
│   ├── components/             # Reusable UI Components
│   │   ├── live/               # LivePlayer, LiveFootballClient, LiveTvClient, MatchCard
│   │   ├── CinemaPlayer.tsx    # Responsive Cinema Video Player
│   │   ├── VoiceController.tsx # AI Voice Command Controller
│   │   ├── AiConcierge.tsx     # Gemini AI Concierge Chatbot
│   │   └── Navbar.tsx          # Netflix-Style Navigation Header
│   ├── services/               # API Clients & Data Services
│   │   ├── kkphimService.ts    # KKPhim API Service
│   │   ├── vsmovService.ts     # VSMOV API Service
│   │   ├── liveFootballService.ts # Live Sports M3U Parser & Dedup
│   │   └── liveTvService.ts    # Live TV Channels & Official SVG Logos
│   └── hooks/                  # Custom React Hooks
├── public/                     # Static Assets, SVGs, Favicons
├── docs/screenshots/           # Screenshots & Preview Banners
├── README.md                   # Project Documentation
└── package.json
```

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**.

<div align="center">
  <sub>Built with passion for cinema and modern web technologies by <strong>NANAFLIX Team</strong> ❤️</sub>
</div>
