"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NetflixLogo } from "../vn-d838105b/icons";

export const NavbarAuth: React.FC = () => {
  const [showBackground, setShowBackground] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Chỉ dùng state này để biết lúc nào nên hiện cái nút "X" xoá chữ
  const [hasText, setHasText] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Dùng ref để lấy dữ liệu ô input thay vì dùng state để tránh lỗi bộ gõ tiếng Việt
  const inputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ từ khoá từ URL vào ô input khi load trang
  useEffect(() => {
    const urlKeyword = searchParams.get("keyword");
    if (urlKeyword && inputRef.current) {
      inputRef.current.value = urlKeyword; // Gán thẳng giá trị vào DOM
      setHasText(true);
      setIsSearchExpanded(true);
    }
  }, [searchParams]);

  // Hiệu ứng đổi màu nền khi cuộn
  useEffect(() => {
    const handleScroll = () => {
      setShowBackground(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSearch = () => {
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (!hasText) {
      setIsSearchExpanded(false);
    }
  };

  const clearSearch = () => {
    if (inputRef.current) {
      inputRef.current.value = ""; // Xoá chữ trong ô input
    }
    setHasText(false);
    inputRef.current?.focus();

    // Nếu đang ở trang tìm kiếm, xoá chữ đi thì quay về trang chủ
    if (searchParams.get("keyword")) {
      router.push("/browse");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lấy giá trị trực tiếp từ DOM khi nhấn Enter
    const currentKeyword = inputRef.current?.value.trim();

    if (currentKeyword) {
      router.push(`/browse?keyword=${encodeURIComponent(currentKeyword)}`);
    }
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 flex items-center justify-between px-8 py-2 transition-colors duration-300 ${showBackground ? "bg-black" : "bg-linear-to-b from-black/80 to-transparent"}`}
    >
      <div className="flex items-center gap-8">
        <div className="w-20">
          <Link href="/browse">
            <NetflixLogo className="w-5 h-auto cursor-pointer" />
          </Link>
        </div>
        <div className="hidden md:flex gap-6 text-white text-sm font-medium">
          <Link href="/browse" className="hover:text-gray-300">
            Trang chủ
          </Link>
          <a href="#" className="hover:text-gray-300">
            Series
          </a>
          <a href="#" className="hover:text-gray-300">
            Phim
          </a>
        </div>
      </div>

      <div className="flex items-center gap-5 text-white">
        <form
          onSubmit={handleSearchSubmit}
          className={`flex items-center  transition-all duration-300 border ${isSearchExpanded ? "border-white px-2 py-1" : "border-transparent"}`}
        >
          <Search size={20} className="cursor-pointer" onClick={toggleSearch} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Phim, diễn viên, thể loại..."
            // Chỉ cập nhật state hasText để ẩn/hiện nút X, không can thiệp vào value của thẻ
            onChange={(e) => setHasText(e.target.value.length > 0)}
            className={`bg-transparent text-white text-sm outline-none transition-all duration-300 ${
              isSearchExpanded
                ? "w-48 lg:w-64 ml-2 opacity-100 placeholder:text-gray-400"
                : "w-0 opacity-0"
            }`}
          />
          {isSearchExpanded && hasText && (
            <X
              size={18}
              className="cursor-pointer text-gray-400 hover:text-white"
              onClick={clearSearch}
            />
          )}
        </form>

        <Bell size={20} className="cursor-pointer" />
        <User size={20} className="cursor-pointer" />
      </div>
    </nav>
  );
};
