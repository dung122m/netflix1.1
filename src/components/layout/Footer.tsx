"use client";

import React from "react";
import Link from "next/link";
import { NanaflixBrandLogo } from "@/components/layout/NetflixLogo";
import { Tooltip } from "@/components/ui/Tooltip";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-[#080808] to-[#030303] text-zinc-400 pt-6 sm:pt-12 pb-28 sm:pb-12 px-4 sm:px-8 md:px-16 mt-6 sm:mt-10 overflow-hidden cv-auto-footer border-t border-white/[0.06]">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto space-y-5 sm:space-y-12 relative z-10">

        {/* ============================================================ */}
        {/* 2A. CỘT ĐIỀU HƯỚNG DESKTOP (4 Cột đầy đủ trên màn hình >= 640px) */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-x-5 sm:gap-x-8 lg:gap-x-10 xl:gap-x-14 2xl:gap-x-16 gap-y-7 sm:gap-y-10 pt-1">
          {/* CỘT 1: THẾ GIỚI ĐIỆN ẢNH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Điện Ảnh
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
              <li>
                <Link href="/" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-bo" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Phim bộ mới
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-le" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Phim lẻ đặc sắc
                </Link>
              </li>
              <li>
                <Link href="/browse?type=phim-chieu-rap" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Phim chiếu rạp
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & LIVE */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Trực Tiếp
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
              <li>
                <Link href="/live?tab=football" prefetch={false} className="hover:text-white transition-colors block truncate text-zinc-300 font-medium">
                  Bóng đá trực tiếp
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Kênh Live TV
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Gameshow & TV
                </Link>
              </li>
              <li>
                <Link href="/browse?type=hoat-hinh" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Hoạt hình Anime
                </Link>
              </li>
              <li>
                <Link href="/my-list" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Danh sách của tôi
                </Link>
              </li>
              <li>
                <Link href="/my-list?tab=history" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Lịch sử xem phim
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: TÍNH NĂNG & TIỆN ÍCH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Khám Phá
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-emerald-300 transition-colors block truncate cursor-pointer text-left w-full font-medium"
                >
                  Cài app (PWA)
                </button>
              </li>
              <li>
                <Link href="/collection" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Bộ sưu tập phim
                </Link>
              </li>
              <li>
                <Link href="/browse" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Bộ lọc phim
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=view" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Bảng xếp hạng Top
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 4: GIỚI THIỆU & PHÁP LÝ */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Thông Tin
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors block truncate text-zinc-300 font-medium"
                >
                  Giới thiệu Nanaflix
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-white transition-colors block truncate"
                >
                  Hỏi & Đáp (FAQ)
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors block truncate"
                >
                  Bảo mật & Riêng tư
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors block truncate"
                >
                  Điều khoản & DMCA
                </Link>
              </li>
              <li>
                <Link
                  href="/about#contact"
                  className="hover:text-white transition-colors block truncate"
                >
                  Trợ giúp & Báo lỗi
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2B. GIAO DIỆN MOBILE TINH GỌN (CHUẨN NETFLIX COMPACT FOOTER) */}
        {/* ============================================================ */}
        <div className="sm:hidden pt-2 pb-1">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
            <Link
              href="/about"
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1 min-w-0"
            >
              Giới thiệu Nanaflix
            </Link>
            <Link
              href="/faq"
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1 min-w-0"
            >
              Hỏi & Đáp (FAQ)
            </Link>
            <Link
              href="/privacy"
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1 min-w-0"
            >
              Bảo mật & Riêng tư
            </Link>
            <Link
              href="/terms"
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1 min-w-0"
            >
              Điều khoản & DMCA
            </Link>
            <Link
              href="/collection"
              className="text-zinc-400 hover:text-white active:text-amber-400 transition-colors block truncate py-1 min-w-0"
            >
              Bộ sưu tập phim
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
              className="text-emerald-400/95 hover:text-emerald-300 active:text-emerald-200 transition-colors block truncate py-1 cursor-pointer text-left min-w-0 font-medium"
            >
              Cài ứng dụng (PWA)
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. BRANDING & CREATOR CARD (DŨNG TRẦN) */}
        {/* ============================================================ */}
        <div className="border-t border-white/[0.08] pt-4 sm:pt-6 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Link href="/" prefetch={false} className="hover:opacity-90 transition inline-flex items-center">
              <NanaflixBrandLogo />
            </Link>
            <span className="text-[11px] sm:text-xs text-zinc-500 sm:border-l sm:border-white/15 sm:pl-3 tracking-tight sm:tracking-normal">
              <span className="whitespace-nowrap">Xem phim trực tuyến</span>
              {" • "}
              <span className="whitespace-nowrap">Không quảng cáo che màn hình</span>
            </span>
          </div>

          <Link
            href="/about"
            prefetch={false}
            className="inline-flex items-center gap-2.5 sm:gap-3 py-1 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl sm:bg-zinc-900/70 sm:hover:bg-zinc-900 transition-all duration-300 group cursor-pointer sm:shadow-lg mx-auto md:mx-0"
          >
            {/* Lá cờ Việt Nam */}
            <Tooltip content="Việt Nam" side="top">
              <div
                className="w-6 h-6 sm:w-9 sm:h-9 rounded-full overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0 flex items-center justify-center bg-[#DA251D] relative shadow-black/60"
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
            </Tooltip>
            <div className="flex flex-col text-left">
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                Designed & Developed by{" "}
                <strong className="text-white font-semibold group-hover:text-netflix-red transition-colors">
                  DT
                </strong>
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-500 font-sans tabular-nums">
                © {new Date().getFullYear()} Nanaflix • Xem phim phi thương mại
              </span>
            </div>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
