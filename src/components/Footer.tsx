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
  FileText,
  Zap,
} from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black text-gray-400 py-12 px-6 md:px-20 mt-16 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* BANNER TRẠNG THÁI HỆ THỐNG */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-200">
              Hệ thống máy chủ trực tuyến ổn định
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>CDN Siêu Tốc</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Không Quảng Cáo</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
              <span>Cập Nhật Tự Động</span>
            </span>
          </div>
        </div>

        {/* Social Icons */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-netflix-red font-black text-xl tracking-tighter">NANAFLIX</span>
            <span className="text-xs text-gray-500">Cinema Streaming Platform</span>
          </div>

          <div className="flex gap-4">
            <a
              href="#"
              aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M14 8h3V4h-3c-3.3 0-5 1.7-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.7.3-1 1-1z" />
              </svg>
            </a>

            <a
              href="#"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>

            <a
              href="#"
              aria-label="Twitter"
              className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2zm-1.1 17.8h1.73L8.27 4.1H6.41L17.8 19.8z" />
              </svg>
            </a>

            <a
              href="#"
              aria-label="Youtube"
              className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white flex items-center justify-center transition-all hover:scale-110"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5v-7L16 12l-6.4 3.5z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-xs text-gray-400 pt-4 border-t border-zinc-900">
          <Link href="/browse" className="flex items-center gap-2 hover:text-white transition">
            <Home size={14} className="text-gray-500" />
            <span>Trang chủ Nanaflix</span>
          </Link>
          <Link href="/browse?type=phim-bo" className="flex items-center gap-2 hover:text-white transition">
            <Tv size={14} className="text-gray-500" />
            <span>Phim bộ tuyển chọn</span>
          </Link>
          <Link href="/browse?type=phim-le" className="flex items-center gap-2 hover:text-white transition">
            <Film size={14} className="text-gray-500" />
            <span>Phim lẻ mới nhất</span>
          </Link>
          <Link href="/browse?type=hoat-hinh" className="flex items-center gap-2 hover:text-white transition">
            <Sparkles size={14} className="text-gray-500" />
            <span>Anime & Hoạt hình</span>
          </Link>
          <Link href="/live" className="flex items-center gap-2 hover:text-white transition">
            <Flame size={14} className="text-red-500" />
            <span>Trực tiếp bóng đá HD</span>
          </Link>
          <Link href="/my-list" className="flex items-center gap-2 hover:text-white transition">
            <Bookmark size={14} className="text-gray-500" />
            <span>Danh sách yêu thích</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 hover:text-white transition">
            <HelpCircle size={14} className="text-gray-500" />
            <span>Trung tâm trợ giúp</span>
          </Link>
          <Link href="#" className="flex items-center gap-2 hover:text-white transition">
            <Shield size={14} className="text-gray-500" />
            <span>Điều khoản & Bảo mật</span>
          </Link>
        </div>

        {/* Powered By */}
        <div className="border-t border-zinc-900 pt-8">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4 group">
              <Image
                src="/images/nana-footer.jpg"
                alt="Nana"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-zinc-800 group-hover:border-zinc-600 group-hover:scale-105 transition-all duration-300"
              />
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-semibold text-zinc-500 leading-tight">
                  Powered By Nana
                </span>
              </div>
            </div>

            <p className="mt-4 text-[11px] sm:text-xs text-zinc-600 text-center">
              © {new Date().getFullYear()} Nanaflix. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
