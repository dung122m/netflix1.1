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
  LifeBuoy,
  Cpu,
  ShieldCheck,
  Compass,
  Layers,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-[#080808] to-[#040404] text-gray-400 pt-12 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-8 md:px-16 mt-14 sm:mt-24 border-t border-white/[0.08] overflow-hidden cv-auto-footer">
      {/* Hiệu ứng ánh sáng tinh tế phía trên footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-netflix-red/70 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 max-w-2xl h-20 bg-netflix-red/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-14 relative z-10">
        {/* ============================================================ */}
        {/* 1. 4 PILLS TÍNH NĂNG ĐẲNG CẤP */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group">
            <div className="p-2 sm:p-2.5 rounded-xl bg-red-600/15 text-netflix-red border border-red-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">4K Ultra HD</h4>
              <p className="text-[11px] text-gray-400 truncate">HLS Adaptive Bitrate</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group">
            <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Gợi Ý Đúng Gu</h4>
              <p className="text-[11px] text-gray-400 truncate">AI Taste Profile</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Không Quảng Cáo</h4>
              <p className="text-[11px] text-gray-400 truncate">100% Giao Diện Sạch</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Đồng Bộ Cloud</h4>
              <p className="text-[11px] text-gray-400 truncate">Tiếp Tục Xem Đa Thiết Bị</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 4 CỘT ĐIỀU HƯỚNG CHÍNH */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pt-2">
          {/* CỘT 1: THẾ GIỚI ĐIỆN ẢNH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <Film className="w-4 h-4 text-netflix-red" />
              Thế Giới Điện Ảnh
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-normal">
              <li>
                <Link href="/" className="hover:text-white transition flex items-center gap-2">
                  <Home size={13} className="text-gray-500" />
                  <span>Trang chủ</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Phim bộ mới nhất</span>
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
              <li>
                <Link href="/collection" className="hover:text-white transition flex items-center gap-2">
                  <Layers size={13} className="text-gray-500" />
                  <span>Bộ sưu tập tuyển chọn</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & TRUYỀN HÌNH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <Flame className="w-4 h-4 text-netflix-red" />
              Trực Tiếp & Live
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-normal">
              <li>
                <Link href="/live?tab=football" className="hover:text-white transition flex items-center gap-2">
                  <Flame size={13} className="text-netflix-red animate-pulse" />
                  <span className="text-gray-300 font-medium">Bóng đá trực tiếp HD</span>
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500" />
                  <span>Kênh truyền hình Live TV</span>
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

          {/* CỘT 3: TÍNH NĂNG & TIỆN ÍCH */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Trợ Lý & Tiện Ích
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-normal">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-ai-roulette"))}
                  className="hover:text-amber-300 transition flex items-center gap-2 cursor-pointer text-left"
                >
                  <Dices size={13} className="text-amber-400" />
                  <span>Bốc quẻ phim ngẫu nhiên</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-emerald-300 transition flex items-center gap-2 cursor-pointer text-emerald-400 font-medium text-left"
                >
                  <Smartphone size={13} />
                  <span>Cài đặt ứng dụng PWA</span>
                </button>
              </li>
              <li>
                <Link href="/browse" className="hover:text-white transition flex items-center gap-2">
                  <Compass size={13} className="text-gray-500" />
                  <span>Bộ lọc phim đa chiều</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: GIỚI THIỆU & PHÁP LÝ */}
          <div className="space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Về Nanaflix
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-normal">
              <li>
                <Link
                  href="/about"
                  className="text-gray-200 hover:text-netflix-red transition flex items-center gap-2 font-medium"
                >
                  <Sparkles size={13} className="text-netflix-red" />
                  <span>Giới thiệu Nanaflix</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-emerald-300 transition flex items-center gap-2 font-medium"
                >
                  <ShieldCheck size={13} className="text-emerald-400" />
                  <span>Bảo mật & Quyền riêng tư</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-amber-300 transition flex items-center gap-2 font-medium"
                >
                  <HelpCircle size={13} className="text-amber-400" />
                  <span>Câu hỏi thường gặp (FAQ)</span>
                </Link>
              </li>
              <li className="flex items-center gap-2 text-gray-500">
                <LifeBuoy size={13} className="text-gray-600" />
                <span>Phiên bản v2.6 Cinematic</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ECOSYSTEM STATUS BAR */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-gray-200">
              Máy chủ phát trực tuyến: <span className="text-emerald-400 font-mono">99.99% Uptime</span> (CDN Toàn Cầu)
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-gray-400 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 hover:text-white transition">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Smart TV & Web</span>
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
        <div className="border-t border-white/[0.08] pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link href="/" className="text-netflix-red font-black text-2xl tracking-tighter hover:opacity-90 transition">
              NANAFLIX
            </Link>
            <span className="text-xs text-gray-500 sm:border-l sm:border-white/15 sm:pl-3">
              Không gian điện ảnh cá nhân hóa • Không quảng cáo rác
            </span>
          </div>

          <Link
            href="/about"
            className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/[0.1] hover:border-netflix-red/50 transition-all duration-300 group cursor-pointer shadow-xl"
          >
            <Image
              src="/images/nana-footer.jpg"
              alt="Dũng Trần"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700 group-hover:border-netflix-red group-hover:scale-105 transition-all duration-300 shadow-md"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs text-gray-300 font-medium">
                Thiết kế & phát triển bởi{" "}
                <strong className="text-white font-bold group-hover:text-netflix-red transition-colors">
                  Dũng Trần
                </strong>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                © {new Date().getFullYear()} Nanaflix • Made with passion
              </span>
            </div>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
