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
  HeartHandshake,
  Cpu,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-b from-transparent via-zinc-950/90 to-black text-gray-400 pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-8 md:px-16 mt-12 sm:mt-20 border-t border-white/10 overflow-hidden cv-auto-footer">
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
              <p className="text-[11px] text-gray-400 truncate">Hình ảnh sắc nét chuẩn rạp</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Âm Thanh Dolby</h4>
              <p className="text-[11px] text-gray-400 truncate">Trải nghiệm sống động</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">0% Quảng Cáo Rác</h4>
              <p className="text-[11px] text-gray-400 truncate">Xem liền mạch, mượt mà</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md shadow-sm hover:border-white/25 transition-all">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">CDN 10Gbps</h4>
              <p className="text-[11px] text-gray-400 truncate">Tải tức thì, không giật lag</p>
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
              Điện Ảnh & Series
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/browse" className="hover:text-white transition flex items-center gap-2">
                  <Home size={13} className="text-gray-500" />
                  <span>Trang chủ Nanaflix</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Phim bộ dài tập</span>
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
                  <span>Bom tấn chiếu rạp</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=hoat-hinh" className="hover:text-white transition flex items-center gap-2">
                  <Sparkles size={13} className="text-gray-500" />
                  <span>Anime & Hoạt hình</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & TRUYỀN HÌNH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Flame className="w-4 h-4 text-netflix-red" />
              Trực Tiếp & TV
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <Link href="/live?tab=football" className="hover:text-white transition flex items-center gap-2">
                  <Flame size={13} className="text-netflix-red animate-pulse" />
                  <span>Trực tiếp bóng đá HD</span>
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Truyền hình VTV, HTV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" className="hover:text-white transition flex items-center gap-2">
                  <Radio size={13} className="text-gray-500" />
                  <span>Game Show & Truyền hình</span>
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="hover:text-white transition flex items-center gap-2">
                  <Bookmark size={13} className="text-gray-500" />
                  <span>Danh sách yêu thích</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: TÍNH NĂNG ĐẲNG CẤP */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Tiện Ích Cao Cấp
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-ai-roulette"))}
                  className="hover:text-white transition flex items-center gap-2 cursor-pointer"
                >
                  <Dices size={13} className="text-amber-400" />
                  <span>Vòng quay &quot;Hôm nay xem gì?&quot;</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-white transition flex items-center gap-2 cursor-pointer text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Smartphone size={13} />
                  <span>Cài đặt Ứng dụng App (PWA)</span>
                </button>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Trailer tự động & Thuyết minh</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Tìm kiếm nhanh (Ctrl + K)</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Ghi nhớ kênh và trận đấu</span>
              </li>
            </ul>
          </div>

          {/* CỘT 4: HỖ TRỢ & HỆ SINH THÁI */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-sm tracking-wider uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Hỗ Trợ & Bảo Vệ
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <LifeBuoy size={13} className="text-gray-500" />
                <span>Hỗ trợ kỹ thuật 24/7</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield size={13} className="text-gray-500" />
                <span>Bảo mật & Quyền riêng tư</span>
              </li>
              <li className="flex items-center gap-2">
                <HeartHandshake size={13} className="text-gray-500" />
                <span>Tuyên bố miễn trừ trách nhiệm</span>
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <HelpCircle size={13} className="text-gray-600" />
                <span>Phiên bản v2.5 Cinematic Pro</span>
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
        {/* 4. BRANDING & POWERED BY NANA */}
        {/* ============================================================ */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-netflix-red font-black text-2xl tracking-tighter">NANAFLIX</span>
            <span className="text-xs text-gray-500 border-l border-white/15 pl-3">
              Nền tảng xem phim & trực tiếp thể thao điện ảnh đỉnh cao
            </span>
          </div>

          <div className="flex items-center gap-3 group">
            <Image
              src="/images/nana-footer.jpg"
              alt="Nana"
              width={44}
              height={44}
              className="w-10 h-10 rounded-full object-cover border border-zinc-700 group-hover:border-netflix-red group-hover:scale-105 transition-all duration-300 shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-zinc-300 group-hover:text-white transition-colors">
                Powered By Nana
              </span>
              <span className="text-[11px] text-zinc-500">
                © {new Date().getFullYear()} Nanaflix. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
