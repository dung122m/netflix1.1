"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Tv,
  Film,
  Sparkles,
  Flame,
  Bookmark,
  Shield,
  HelpCircle,
  Zap,
  Radio,
  Clapperboard,
  Dices,
  Monitor,
  Smartphone,
  Cast,
  CheckCircle2,
  LifeBuoy,
  Cpu,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-zinc-950/90 to-black text-gray-400 pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-8 md:px-16 mt-12 sm:mt-20 border-t border-white/10 overflow-hidden cv-auto-footer">
      {/* Hiệu ứng hào quang rực rỡ phía trên footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-px bg-gradient-to-r from-transparent via-netflix-red/60 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 max-w-2xl h-16 bg-netflix-red/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* ============================================================ */}
        {/* 1. KẤU VỰC TÍNH NĂNG ĐẲNG CẤP (4 PILLS) — Ẩn trên mobile */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-red-600/20 text-netflix-red border border-red-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">4K Ultra HD</h4>
              <p className="text-[11px] text-gray-400 truncate">Cinema Quality Video</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Dolby Audio</h4>
              <p className="text-[11px] text-gray-400 truncate">Surround Sound</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">No Ads</h4>
              <p className="text-[11px] text-gray-400 truncate">Seamless Streaming</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">CDN 10Gbps</h4>
              <p className="text-[11px] text-gray-400 truncate">Fast & Buffer-Free</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 4 CỘT ĐIỀU HƯỚNG — Ẩn trên mobile */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-10 pt-4">
          {/* CỘT 1: THẾ GIỚI ĐIỆN ẢNH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Film className="w-4 h-4 text-netflix-red" />
              Phim Lẻ & Phim Bộ
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition flex items-center gap-2">
                  <Home size={13} className="text-gray-500" />
                  <span>Trang chủ Nanaflix</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Phim bộ mới</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-le" className="hover:text-white transition flex items-center gap-2">
                  <Film size={13} className="text-gray-500" />
                  <span>Phim lẻ đặc sắc</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-chieu-rap" className="hover:text-white transition flex items-center gap-2">
                  <Clapperboard size={13} className="text-gray-500" />
                  <span>Phim chiếu rạp</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=hoat-hinh" className="hover:text-white transition flex items-center gap-2">
                  <Sparkles size={13} className="text-gray-500" />
                  <span>Hoạt hình & Anime</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & TRUYỀN HÌNH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Flame className="w-4 h-4 text-netflix-red" />
              Trực tiếp & TV
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/live?tab=football" className="hover:text-white transition flex items-center gap-2">
                  <Flame size={13} className="text-netflix-red animate-pulse" />
                  <span>Bóng đá trực tiếp HD</span>
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Truyền hình Live TV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" className="hover:text-white transition flex items-center gap-2">
                  <Radio size={13} className="text-gray-500" />
                  <span>Gameshow & TV Shows</span>
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="hover:text-white transition flex items-center gap-2">
                  <Bookmark size={13} className="text-gray-500" />
                  <span>Danh sách phim của tôi</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: TÍNH NĂNG ĐẲNG CẤP */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Hỏi Nana & AI
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-ai-roulette"))}
                  className="hover:text-white transition flex items-center gap-2 cursor-pointer"
                >
                  <Dices size={13} className="text-amber-400" />
                  <span>Bốc quẻ phim ngẫu nhiên</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-white transition flex items-center gap-2 cursor-pointer text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Smartphone size={13} />
                  <span>Cài đặt ứng dụng (PWA)</span>
                </button>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Xem trailer tự động</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Tìm kiếm thông minh (Ctrl + K)</span>
              </li>
            </ul>
          </div>

          {/* CỘT 4: HỖ TRỢ & HỆ SINH THÁI */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Giới thiệu Nanaflix
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white transition flex items-center gap-2 text-zinc-300 hover:text-red-400 font-medium">
                  <Sparkles size={13} className="text-netflix-red" />
                  <span>Giới thiệu Nanaflix</span>
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <LifeBuoy size={13} className="text-gray-500" />
                <span>Hỗ trợ 24/7</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield size={13} className="text-gray-500" />
                <span>Bảo mật & Quyền riêng tư</span>
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <HelpCircle size={13} className="text-gray-600" />
                <span>v2.5 Cinematic Pro</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. THIẾT BỊ HỖ TRỢ (ECOSYSTEM BAR) — Ẩn trên mobile */}
        {/* ============================================================ */}
        <div className="hidden sm:flex p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-200">
              Hệ thống máy chủ hoạt động: 99.99% Uptime (12ms)
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1.5 hover:text-white transition">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Smart TV</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition">
              <Cast className="w-3.5 h-3.5 text-amber-400" />
              <span>Chromecast / AirPlay</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition">
              <Smartphone className="w-3.5 h-3.5 text-rose-400" />
              <span>iOS / Android</span>
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. BRANDING & CREATED BY DŨNG TRẦN */}
        {/* ============================================================ */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <span className="text-netflix-red font-black text-2xl tracking-tighter">NANAFLIX</span>
            <span className="text-xs text-gray-500 sm:border-l sm:border-white/15 sm:pl-3">
              Nền tảng xem phim & trực tiếp thể thao điện ảnh đỉnh cao
            </span>
          </div>

          <Link
            href="/about"
            className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/10 hover:border-netflix-red/50 transition-all duration-300 group cursor-pointer shadow-sm"
          >
            <Image
              src="/images/nana-footer.jpg"
              alt="Dũng Trần"
              width={44}
              height={44}
              className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 group-hover:border-netflix-red group-hover:scale-105 transition-all duration-300 shadow-md"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs text-gray-300 font-medium">
                Created & Developed by{" "}
                <strong className="text-white font-bold group-hover:text-netflix-red transition-colors">
                  Dũng Trần
                </strong>
              </span>
              <span className="text-[11px] text-zinc-500">
                Powered By Nana • © {new Date().getFullYear()} Nanaflix
              </span>
            </div>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
