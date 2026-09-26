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
  Cpu,
  ShieldCheck,
  Compass,
  Layers,
  Scale,
  Users,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-[#080808] to-[#030303] text-gray-400 pt-10 sm:pt-16 pb-28 sm:pb-12 px-4 sm:px-8 md:px-16 mt-12 sm:mt-20 border-t border-white/[0.08] overflow-hidden cv-auto-footer">
      {/* Hiệu ứng ánh sáng tinh tế phía trên footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-netflix-red/70 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 max-w-2xl h-16 sm:h-20 bg-netflix-red/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 relative z-10">
        
        {/* ============================================================ */}
        {/* 1. 4 PILLS TÍNH NĂNG ĐẲNG CẤP (2x2 trên mobile, 4 col trên desktop) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-white/[0.06] sm:border-white/[0.08] backdrop-blur-xl shadow-md hover:border-white/20 transition-all group">
            <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-red-600/15 text-netflix-red border border-red-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-[11px] sm:text-sm font-bold truncate">4K Ultra HD</h4>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">HLS Adaptive Bitrate</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-white/[0.06] sm:border-white/[0.08] backdrop-blur-xl shadow-md hover:border-white/20 transition-all group">
            <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-[11px] sm:text-sm font-bold truncate">Gợi Ý Đúng Gu</h4>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">AI Taste Profile</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-white/[0.06] sm:border-white/[0.08] backdrop-blur-xl shadow-md hover:border-white/20 transition-all group">
            <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-[11px] sm:text-sm font-bold truncate">Không Quảng Cáo</h4>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">100% Giao Diện Sạch</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-white/[0.06] sm:border-white/[0.08] backdrop-blur-xl shadow-md hover:border-white/20 transition-all group">
            <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-[11px] sm:text-sm font-bold truncate">Đồng Bộ Cloud</h4>
              <p className="text-[10px] sm:text-[11px] text-gray-400 truncate">Tiếp Tục Xem Đa Thiết Bị</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. CỘT ĐIỀU HƯỚNG (Cân đối 100% 5 mục mỗi cột trên mọi màn hình) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-7 sm:gap-y-10 pt-1">
          {/* CỘT 1: THẾ GIỚI ĐIỆN ẢNH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 sm:gap-2">
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
              <span>Điện Ảnh</span>
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-xs text-gray-400 font-normal">
              <li>
                <Link href="/" className="hover:text-white transition flex items-center gap-2">
                  <Home size={13} className="text-gray-500 shrink-0" />
                  <span>Trang chủ</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500 shrink-0" />
                  <span>Phim bộ mới</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-le" className="hover:text-white transition flex items-center gap-2">
                  <Film size={13} className="text-gray-500 shrink-0" />
                  <span>Phim lẻ đặc sắc</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-chieu-rap" className="hover:text-white transition flex items-center gap-2">
                  <Clapperboard size={13} className="text-gray-500 shrink-0" />
                  <span>Phim chiếu rạp</span>
                </Link>
              </li>
              <li>
                <Link href="/dien-vien" className="hover:text-white transition flex items-center gap-2 font-medium text-gray-200">
                  <Users size={13} className="text-netflix-red shrink-0" />
                  <span>Diễn viên & Nghệ sĩ</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & LIVE */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 sm:gap-2">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
              <span>Trực Tiếp</span>
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-xs text-gray-400 font-normal">
              <li>
                <Link href="/live?tab=football" className="hover:text-white transition flex items-center gap-2">
                  <Flame size={13} className="text-netflix-red animate-pulse shrink-0" />
                  <span className="text-gray-200 font-medium">Bóng đá trực tiếp</span>
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" className="hover:text-white transition flex items-center gap-2">
                  <Tv size={13} className="text-gray-500 shrink-0" />
                  <span>Kênh Live TV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" className="hover:text-white transition flex items-center gap-2">
                  <Radio size={13} className="text-gray-500 shrink-0" />
                  <span>Gameshow & TV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=hoat-hinh" className="hover:text-white transition flex items-center gap-2">
                  <Sparkles size={13} className="text-gray-500 shrink-0" />
                  <span>Hoạt hình Anime</span>
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="hover:text-white transition flex items-center gap-2">
                  <Bookmark size={13} className="text-gray-500 shrink-0" />
                  <span>Danh sách của tôi</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: TÍNH NĂNG & TIỆN ÍCH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Khám Phá</span>
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-xs text-gray-400 font-normal">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-ai-roulette"))}
                  className="hover:text-amber-300 transition flex items-center gap-2 cursor-pointer text-left w-full"
                >
                  <Dices size={13} className="text-amber-400 shrink-0" />
                  <span>Bốc quẻ phim AI</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-emerald-300 transition flex items-center gap-2 cursor-pointer text-emerald-400 font-medium text-left w-full"
                >
                  <Smartphone size={13} className="shrink-0" />
                  <span>Cài app (PWA)</span>
                </button>
              </li>
              <li>
                <Link href="/collection" className="hover:text-white transition flex items-center gap-2">
                  <Layers size={13} className="text-gray-500 shrink-0" />
                  <span>Bộ sưu tập phim</span>
                </Link>
              </li>
              <li>
                <Link href="/browse" className="hover:text-white transition flex items-center gap-2">
                  <Compass size={13} className="text-gray-500 shrink-0" />
                  <span>Bộ lọc phim đa chiều</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=view" className="hover:text-white transition flex items-center gap-2">
                  <Flame size={13} className="text-amber-400 shrink-0" />
                  <span>Bảng xếp hạng Top</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: GIỚI THIỆU & PHÁP LÝ */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 sm:gap-2">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Thông Tin</span>
            </h4>
            <ul className="space-y-2.5 text-[11px] sm:text-xs text-gray-400 font-normal">
              <li>
                <Link
                  href="/about"
                  className="text-gray-200 hover:text-netflix-red transition flex items-center gap-2 font-medium"
                >
                  <Sparkles size={13} className="text-netflix-red shrink-0" />
                  <span>Giới thiệu Nanaflix</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-amber-300 transition flex items-center gap-2 font-medium"
                >
                  <HelpCircle size={13} className="text-amber-400 shrink-0" />
                  <span>Hỏi & Đáp (FAQ)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-emerald-300 transition flex items-center gap-2 font-medium"
                >
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span>Bảo mật & Riêng tư</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-blue-300 transition flex items-center gap-2 font-medium"
                >
                  <Scale size={13} className="text-blue-400 shrink-0" />
                  <span>Điều khoản & DMCA</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/about#contact"
                  className="hover:text-rose-300 transition flex items-center gap-2 font-medium"
                >
                  <Users size={13} className="text-rose-400 shrink-0" />
                  <span>Trợ giúp & Báo lỗi</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ECOSYSTEM STATUS BAR */}
        {/* ============================================================ */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-gray-200">
              Hệ thống: <span className="text-emerald-400 font-mono">99.99% Uptime</span> • CDN Tốc độ cao
            </span>
          </div>

          <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-5 text-[10px] sm:text-xs text-gray-400">
            <span className="flex items-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none border border-white/5 sm:border-none">
              <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
              <span>Smart TV</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none border border-white/5 sm:border-none">
              <Cast className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span>Cast / AirPlay</span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none border border-white/5 sm:border-none">
              <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              <span>Mobile App</span>
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. BRANDING & CREATOR CARD (DŨNG TRẦN) */}
        {/* ============================================================ */}
        <div className="border-t border-white/[0.08] pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <Link href="/" className="text-netflix-red font-black text-xl sm:text-2xl tracking-tighter hover:opacity-90 transition">
              NANAFLIX
            </Link>
            <span className="text-[11px] sm:text-xs text-gray-500 sm:border-l sm:border-white/15 sm:pl-3">
              Không gian điện ảnh cá nhân hóa • Không quảng cáo rác
            </span>
          </div>

          <Link
            href="/about"
            className="flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/[0.08] sm:border-white/[0.1] hover:border-netflix-red/50 transition-all duration-300 group cursor-pointer shadow-lg"
          >
            <Image
              src="/images/nana-footer.jpg"
              alt="Dũng Trần"
              width={36}
              height={36}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-zinc-700 group-hover:border-netflix-red group-hover:scale-105 transition-all duration-300 shadow-md shrink-0"
            />
            <div className="flex flex-col text-left">
              <span className="text-[11px] sm:text-xs text-gray-300 font-medium">
                Designed & Developed by{" "}
                <strong className="text-white font-bold group-hover:text-netflix-red transition-colors">
                  Dũng Trần
                </strong>
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
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
