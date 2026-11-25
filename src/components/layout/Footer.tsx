"use client";

import React from "react";
import Link from "next/link";
import { NanaflixBrandLogo } from "@/components/layout/NetflixLogo";
import { Tooltip } from "@/components/ui/Tooltip";

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-0 bg-gradient-to-b from-transparent via-[#080808] to-[#030303] text-zinc-400 pt-6 sm:pt-12 pb-8 sm:pb-12 px-4 sm:px-8 md:px-16 mt-6 sm:mt-10 overflow-hidden cv-auto-footer border-t border-white/[0.06]">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto space-y-5 sm:space-y-8 relative z-10">

        {/* ============================================================ */}
        {/* 1. CỘT ĐIỀU HƯỚNG DESKTOP (4 Cột cân xứng, mỗi cột đúng 5 mục) */}
        {/* ============================================================ */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-x-5 sm:gap-x-8 lg:gap-x-10 xl:gap-x-14 2xl:gap-x-16 gap-y-7 sm:gap-y-10 pt-1">
          {/* CỘT 1: ĐIỆN ẢNH & PHIM */}
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
              <li>
                <Link href="/browse?type=hoat-hinh" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Hoạt hình Anime
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 2: TRỰC TIẾP & THỂ THAO */}
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
                <Link href="/live?tab=football" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Lịch thi đấu thể thao
                </Link>
              </li>
              <li>
                <Link href="/browse?type=tv-shows" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Gameshow & TV Show
                </Link>
              </li>
              <li>
                <Link href="/live?tab=tv" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Kênh truyền hình HD
                </Link>
              </li>
            </ul>
          </div>

          {/* CỘT 3: KHÁM PHÁ & TIỆN ÍCH */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Khám Phá
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
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
              <li>
                <Link href="/collection" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Bộ sưu tập phim
                </Link>
              </li>
              <li>
                <Link href="/browse?sort=view" prefetch={false} className="hover:text-white transition-colors block truncate">
                  Bảng xếp hạng Top
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                  className="hover:text-white transition-colors block truncate cursor-pointer text-left w-full font-normal"
                >
                  Cài ứng dụng (PWA)
                </button>
              </li>
            </ul>
          </div>

          {/* CỘT 4: THÔNG TIN & PHÁP LÝ */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-white font-semibold text-sm">
              Thông Tin
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
              <li>
                <Link
                  href="/about"
                  prefetch={false}
                  className="hover:text-white transition-colors block truncate text-zinc-300 font-medium"
                >
                  Giới thiệu Nanaflix
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  prefetch={false}
                  className="hover:text-white transition-colors block truncate"
                >
                  Hỏi & Đáp (FAQ)
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  prefetch={false}
                  className="hover:text-white transition-colors block truncate"
                >
                  Bảo mật & Riêng tư
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  prefetch={false}
                  className="hover:text-white transition-colors block truncate"
                >
                  Điều khoản & DMCA
                </Link>
              </li>
              <li>
                <Link
                  href="/about#contact"
                  prefetch={false}
                  className="hover:text-white transition-colors block truncate"
                >
                  Trợ giúp & Báo lỗi
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. GIAO DIỆN MOBILE TINH GỌN (CĂN GIỮA ĐỒNG TRỤC CÂN ĐỐI) */}
        {/* ============================================================ */}
        <div className="sm:hidden pt-1 pb-2">
          <div className="max-w-[320px] mx-auto grid grid-cols-2 gap-x-6 gap-y-3 text-xs text-center">
            <Link
              href="/about"
              prefetch={false}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1"
            >
              Giới thiệu Nanaflix
            </Link>
            <Link
              href="/faq"
              prefetch={false}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1"
            >
              Hỏi & Đáp (FAQ)
            </Link>
            <Link
              href="/privacy"
              prefetch={false}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1"
            >
              Bảo mật & Riêng tư
            </Link>
            <Link
              href="/terms"
              prefetch={false}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1"
            >
              Điều khoản & DMCA
            </Link>
            <Link
              href="/collection"
              prefetch={false}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1"
            >
              Bộ sưu tập phim
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
              className="text-zinc-400 hover:text-white active:text-netflix-red transition-colors block truncate py-1 cursor-pointer text-center font-normal"
            >
              Cài ứng dụng (PWA)
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. BRANDING & CREATOR CARD */}
        {/* ============================================================ */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <Link href="/" prefetch={false} className="hover:opacity-90 transition inline-flex items-center">
            <NanaflixBrandLogo />
          </Link>

          <Link
            href="/about"
            prefetch={false}
            className="inline-flex items-center gap-2.5 sm:gap-3 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl sm:bg-zinc-900/70 sm:hover:bg-zinc-900 transition-all duration-300 group cursor-pointer sm:shadow-lg mx-auto md:mx-0"
          >
            {/* Lá cờ Việt Nam */}
            <Tooltip content="Việt Nam" side="top">
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0 flex items-center justify-center bg-[#DA251D] relative shadow-black/60"
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
