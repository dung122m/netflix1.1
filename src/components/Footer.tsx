"use client";

import React from "react";
import Link from "next/link";
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
  Monitor,
  Smartphone,
  Cast,
  Cpu,
  ShieldCheck,
  Compass,
  Layers,
  Scale,
  Users,
  History,
} from "lucide-react";
import { NanaflixBrandLogo } from "@/components/NetflixLogo";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-[#080808] to-[#030303] text-zinc-400 pt-6 sm:pt-12 pb-12 sm:pb-12 px-4 sm:px-8 md:px-16 mt-6 sm:mt-10 overflow-hidden cv-auto-footer">
      {/* Hiệu ứng ánh sáng tinh tế phía trên footer (không dùng đường kẻ cứng) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 max-w-2xl h-16 sm:h-20 bg-netflix-red/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto space-y-5 sm:space-y-12 relative z-10">
        
        {/* ============================================================ */}
        {/* 1. 4 PILLS TÍNH NĂNG ĐẲNG CẤP (Ẩn trên mobile để footer tinh gọn) */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-950/60 backdrop-blur-xl shadow-md hover:bg-zinc-900/70 transition-all group min-h-[52px] sm:min-h-[60px]">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-netflix-red/15 text-netflix-red group-hover:scale-105 transition-transform flex-shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">4K Ultra HD</h4>
              <p className="text-xs text-zinc-400 truncate">HLS Adaptive Bitrate</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-950/60 backdrop-blur-xl shadow-md hover:bg-zinc-900/70 transition-all group min-h-[52px] sm:min-h-[60px]">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/15 text-amber-400 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Gợi Ý Đúng Gu</h4>
              <p className="text-xs text-zinc-400 truncate">AI Taste Profile</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-950/60 backdrop-blur-xl shadow-md hover:bg-zinc-900/70 transition-all group min-h-[52px] sm:min-h-[60px]">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Không Quảng Cáo</h4>
              <p className="text-xs text-zinc-400 truncate">100% Giao Diện Sạch</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-950/60 backdrop-blur-xl shadow-md hover:bg-zinc-900/70 transition-all group min-h-[52px] sm:min-h-[60px]">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500/15 text-blue-400 group-hover:scale-105 transition-transform flex-shrink-0">
              <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-white text-xs sm:text-sm font-bold truncate">Đồng Bộ Cloud</h4>
              <p className="text-xs text-zinc-400 truncate">Xem Đa Thiết Bị</p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2A. CỘT ĐIỀU HƯỚNG DESKTOP (4 Cột đầy đủ trên màn hình >= 640px) */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-x-5 sm:gap-x-8 lg:gap-x-10 xl:gap-x-14 2xl:gap-x-16 gap-y-7 sm:gap-y-10 pt-1">
          {/* CỘT 1: THẾ GIỚI ĐIỆN ẢNH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
              </span>
              <span>Điện Ảnh</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-300 font-normal">
              <li>
                <Link href="/" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Home size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Trang chủ</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Tv size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Phim bộ mới</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-le" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Film size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Phim lẻ đặc sắc</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-chieu-rap" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Clapperboard size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Phim chiếu rạp</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & LIVE */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
              </span>
              <span>Trực Tiếp</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-300 font-normal">
              <li>
                <Link href="/live?tab=football" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Flame size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate text-zinc-200 font-medium">Bóng đá trực tiếp</span>
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Tv size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Kênh Live TV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Radio size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Gameshow & TV</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?type=hoat-hinh" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Hoạt hình Anime</span>
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Bookmark size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Danh sách của tôi</span>
                </Link>
              </li>
              <li>
                <Link href="/my-list?tab=history" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <History size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Lịch sử xem phim</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: TÍNH NĂNG & TIỆN ÍCH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </span>
              <span>Khám Phá</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-300 font-normal">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-2 cursor-pointer text-left w-full group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Smartphone size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate  font-medium">Cài app (PWA)</span>
                </button>
              </li>
              <li>
                <Link href="/collection" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Layers size={13} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  </span>
                  <span className="truncate">Bộ sưu tập phim</span>
                </Link>
              </li>
              <li>
                <Link href="/browse" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Compass size={13} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  </span>
                  <span className="truncate">Bộ lọc phim đa chiều</span>
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=view" className="hover:text-white transition-colors flex items-center gap-2 group">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Flame size={13} className="text-zinc-400 group-hover:text-amber-400 transition-colors" />
                  </span>
                  <span className="truncate">Bảng xếp hạng Top</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: GIỚI THIỆU & PHÁP LÝ */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-netflix-red" />
              </span>
              <span>Thông Tin</span>
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-300 font-normal">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate text-zinc-200 font-medium">Giới thiệu Nanaflix</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <HelpCircle size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Hỏi & Đáp (FAQ)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <ShieldCheck size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Bảo mật & Riêng tư</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Scale size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Điều khoản & DMCA</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/about#contact"
                  className="hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Users size={13} className="text-zinc-400 group-hover:text-netflix-red transition-colors" />
                  </span>
                  <span className="truncate">Trợ giúp & Báo lỗi</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2B. GIAO DIỆN MOBILE TINH GỌN (CHUẨN NETFLIX COMPACT FOOTER) */}
        {/* ============================================================ */}
        <div className="sm:hidden pt-1">
          {/* Lưới 6 ô liên kết cân đối 100%, bo góc mềm mại, TUYỆT ĐỐI KHÔNG DÙNG VIỀN */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/about"
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-center truncate"
            >
              Giới thiệu Nanaflix
            </Link>
            <Link
              href="/faq"
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-center truncate"
            >
              Hỏi & Đáp (FAQ)
            </Link>
            <Link
              href="/privacy"
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-center truncate"
            >
              Bảo mật & Riêng tư
            </Link>
            <Link
              href="/terms"
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-center truncate"
            >
              Điều khoản & DMCA
            </Link>
            <Link
              href="/collection"
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-zinc-300 hover:text-white transition-colors text-center truncate"
            >
              Bộ sưu tập phim
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
              className="flex items-center justify-center py-2.5 px-2.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] text-emerald-400 hover:text-emerald-300 transition-colors text-center truncate cursor-pointer"
            >
              Cài ứng dụng (PWA)
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. ECOSYSTEM STATUS BAR */}
        {/* ============================================================ */}
        <div className="py-2.5 px-1 sm:p-4 rounded-xl sm:rounded-2xl sm:bg-zinc-950/70 sm:border sm:border-white/[0.08] sm:backdrop-blur-xl flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2.5 w-full sm:w-auto text-center">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-zinc-400">
              Hệ thống: <span className="text-emerald-400 font-sans tabular-nums font-medium">99.99% Uptime</span> • CDN Tốc độ cao
            </span>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-2 sm:gap-5 text-xs text-zinc-300 w-full sm:w-auto">
            <span className="flex items-center justify-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2 sm:px-2.5 py-1.5 sm:p-0 rounded-lg sm:rounded-none sm:border-none whitespace-nowrap">
              <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400 shrink-0" />
              <span>Smart TV</span>
            </span>
            <span className="flex items-center justify-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2 sm:px-2.5 py-1.5 sm:p-0 rounded-lg sm:rounded-none sm:border-none whitespace-nowrap">
              <Cast className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span>Cast / AirPlay</span>
            </span>
            <span className="flex items-center justify-center gap-1.5 hover:text-white transition bg-white/5 sm:bg-transparent px-2 sm:px-2.5 py-1.5 sm:p-0 rounded-lg sm:rounded-none sm:border-none whitespace-nowrap">
              <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 shrink-0" />
              <span>Mobile App</span>
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. BRANDING & CREATOR CARD (DŨNG TRẦN) */}
        {/* ============================================================ */}
        <div className="border-t border-white/[0.08] pt-4 sm:pt-6 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Link href="/" className="hover:opacity-90 transition inline-flex items-center">
              <NanaflixBrandLogo />
            </Link>
            <span className="text-[11px] sm:text-xs text-zinc-500 sm:border-l sm:border-white/15 sm:pl-3 tracking-tight sm:tracking-normal">
              <span className="whitespace-nowrap">Không gian điện ảnh cá nhân hóa</span>
              {" • "}
              <span className="whitespace-nowrap">Không quảng cáo rác</span>
            </span>
          </div>

          <Link
            href="/about"
            className="inline-flex items-center gap-2.5 sm:gap-3 py-1 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl sm:bg-zinc-950/80 sm:hover:bg-zinc-900 sm:border sm:border-white/[0.08] sm:hover:border-netflix-red/50 transition-all duration-300 group cursor-pointer sm:shadow-lg mx-auto md:mx-0"
          >
            {/* Lá cờ Việt Nam */}
            <div
              className="w-6 h-6 sm:w-9 sm:h-9 rounded-full overflow-hidden border-0 sm:border-2 sm:border-zinc-700 group-hover:border-netflix-red group-hover:scale-105 transition-all duration-300 shadow-sm shrink-0 flex items-center justify-center bg-[#DA251D] relative shadow-black/60"
              title="Việt Nam"
              aria-label="Cờ Việt Nam"
            >
              <svg
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-cover"
              >
                <circle cx="256" cy="256" r="256" fill="#DA251D" />
                <defs>
                  <linearGradient id="footer-vn-flag-star" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFF775" />
                    <stop offset="50%" stopColor="#FFDE00" />
                    <stop offset="100%" stopColor="#E5A900" />
                  </linearGradient>
                </defs>
                <polygon
                  points="
                    256, 110
                    289.4, 213
                    397.6, 213
                    310.1, 276.5
                    343.5, 379.5
                    256, 316
                    168.5, 379.5
                    201.9, 276.5
                    114.4, 213
                    222.6, 213
                  "
                  fill="url(#footer-vn-flag-star)"
                />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Designed & Developed by{" "}
                <strong className="text-white font-semibold group-hover:text-netflix-red transition-colors">
                  DT
                </strong>
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-500 font-sans tabular-nums">
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
