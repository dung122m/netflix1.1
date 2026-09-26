"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Tv,
  MonitorSmartphone,
  Bot,
  ShieldCheck,
  Sparkles,
  LifeBuoy,
  Play,
  Film,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface FAQItem {
  id: string;
  category: "player" | "account" | "ai" | "privacy";
  categoryLabel: string;
  question: string;
  answer: string;
  tips?: string;
}

const FAQ_DATA: FAQItem[] = [
  // 1. Trình phát & Video
  {
    id: "p1",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Tại sao phim bị đứng hình hoặc tải chậm khi đang xem?",
    answer:
      "Tốc độ tải phim phụ thuộc vào đường truyền mạng của bạn và lưu lượng tải của máy chủ phát lúc cao điểm. Nanaflix sử dụng công nghệ HLS tự động thích ứng độ phân giải theo băng thông.",
    tips: "Mẹo khắc phục: Tại thanh điều khiển của trình phát phim, bấm nút đổi 'Server phát' (Server Dự Phòng / Server Direct) hoặc giảm độ phân giải xuống 720p/1080p.",
  },
  {
    id: "p2",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Nanaflix có hỗ trợ độ phân giải 4K Ultra HD không?",
    answer:
      "Có! Các bộ phim điện ảnh bom tấn và series truyền hình có nguồn phát chất lượng 4K/Full HD sẽ tự động được hiển thị với chất lượng cao nhất khi đường truyền của bạn đáp ứng đủ băng thông.",
  },
  {
    id: "p3",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Các phím tắt điều khiển trên bàn phím là gì?",
    answer:
      "Khi xem phim trên máy tính, bạn có thể sử dụng các phím tắt tiện lợi: Phím Space / K (Tạm dừng/Phát), Phím F (Toàn màn hình), Phím M (Bật/Tắt tiếng), Mũi tên Trái/Phải (Tua lùi/Tua tới 5s), Mũi tên Lên/Xuống (Tăng/Giảm âm lượng), Phím T (Bật chế độ rạp chiếu Theater Mode).",
  },
  {
    id: "p4",
    category: "player",
    categoryLabel: "Trình Phát & Video",
    question: "Nếu video bị mất tiếng hoặc lệch phụ đề thì xử lý thế nào?",
    answer:
      "Một số trình duyệt có thể tắt tiếng mặc định khi phát tự động. Bạn chỉ cần bấm vào biểu tượng Loa ở góc dưới video để bật âm thanh. Nếu phụ đề bị lệch, hãy thử chuyển sang Server phát dự phòng khác trong danh sách.",
  },

  // 2. Tài khoản & Đồng bộ
  {
    id: "a1",
    category: "account",
    categoryLabel: "Tài Khoản & Đồng Bộ",
    question: "Làm thế nào để tiếp tục xem phim dở giữa điện thoại và máy tính?",
    answer:
      "Bạn chỉ cần đăng nhập cùng một tài khoản (qua Google hoặc Email). Hệ thống sẽ tự động ghi nhớ giây xem dở và tập phim hiện tại lên đám mây, giúp mục 'Tiếp tục xem' hiển thị chuẩn xác ngay khi bạn đổi thiết bị.",
  },
  {
    id: "a2",
    category: "account",
    categoryLabel: "Tài Khoản & Đồng Bộ",
    question: "Tôi không có tài khoản có xem phim được không?",
    answer:
      "Hoàn toàn được! Bạn có thể xem phim ngay lập tức dưới tư cách Khách (Guest) mà không bắt buộc phải đăng nhập. Tuy nhiên, khi đăng nhập tài khoản, bạn sẽ có thêm các tính năng cao cấp như: Đồng bộ lịch sử xem qua đám mây, Tạo danh sách phim yêu thích, Đánh giá phim và Lưu cấu hình phụ đề riêng.",
  },
  {
    id: "a3",
    category: "account",
    categoryLabel: "Tài Khoản & Đồng Bộ",
    question: "Làm thế nào để xóa phim khỏi danh sách xem tiếp hoặc danh sách yêu thích?",
    answer:
      "Tại hàng 'Tiếp tục xem' hoặc trang 'Danh sách của tôi' (/my-list), bạn chỉ cần di chuột hoặc chạm vào nút Thùng rác (Xóa) trên thẻ phim đó để gỡ bỏ ngay lập tức.",
  },

  // 3. Trợ lý AI Nana
  {
    id: "ai1",
    category: "ai",
    categoryLabel: "Trợ Lý AI Nana",
    question: "Trợ lý AI Nana giúp được gì cho tôi?",
    answer:
      "AI Nana là trợ lý điện ảnh thông minh tích hợp sẵn trên website. Bạn có thể trò chuyện tự nhiên như: 'Gợi ý phim trinh thám Hàn Quốc có plot twist bất ngờ', 'Tìm phim hoạt hình nhẹ nhàng xem cuối tuần', hoặc bấm 'Bốc quẻ phim' để AI chọn ngẫu nhiên một siêu phẩm phù hợp với tâm trạng.",
  },
  {
    id: "ai2",
    category: "ai",
    categoryLabel: "Trợ Lý AI Nana",
    question: "Tính năng 'Taste Profile' hoạt động như thế nào?",
    answer:
      "Hệ thống phân tích các thể loại, quốc gia và diễn viên từ những bộ phim bạn đã xem để tự động gợi ý các tác phẩm có điểm tương đồng cao nhất tại mục 'Dành Riêng Cho Bạn' (For You) trên trang chủ.",
  },

  // 4. Bảo mật & Chi phí
  {
    id: "sec1",
    category: "privacy",
    categoryLabel: "Bảo Mật & Chi Phí",
    question: "Nanaflix có thu phí hàng tháng hay bắt xem quảng cáo không?",
    answer:
      "Không! Nanaflix là dự án phi thương mại được xây dựng vì đam mê điện ảnh và công nghệ. 100% không thu phí, không bán gói VIP, và cam kết không chèn banner quảng cáo cờ bạc làm phiền người xem.",
  },
  {
    id: "sec2",
    category: "privacy",
    categoryLabel: "Bảo Mật & Chi Phí",
    question: "Dữ liệu cá nhân của tôi được bảo vệ như thế nào?",
    answer:
      "Chúng tôi áp dụng các tiêu chuẩn an toàn cao nhất: Quản lý đăng nhập qua Firebase Auth, cơ sở dữ liệu Supabase được bảo vệ bởi Row Level Security (RLS), và không lưu giữ địa chỉ IP thực của bạn trong hệ thống.",
  },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả câu hỏi", icon: Sparkles },
  { id: "player", label: "Trình phát & Video", icon: Tv },
  { id: "account", label: "Tài khoản & Đồng bộ", icon: MonitorSmartphone },
  { id: "ai", label: "Trợ lý AI Nana", icon: Bot },
  { id: "privacy", label: "Bảo mật & Chi phí", icon: ShieldCheck },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    p1: true,
    a1: true,
    sec1: true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFAQs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.12),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* ================= HERO HEADER ================= */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-gray-300 backdrop-blur-xl shadow-sm">
            <HelpCircle size={14} className="text-netflix-red" />
            <span>Trung Tâm Hỗ Trợ & Giải Đáp</span>
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
              Câu Hỏi <span className="text-netflix-red">Thường Gặp</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 font-normal leading-relaxed">
              Tất cả những điều bạn cần biết về trải nghiệm xem phim, tính năng đồng bộ và công nghệ tại Nanaflix.
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="max-w-xl mx-auto relative pt-2">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu hỏi (ví dụ: lag, đồng bộ, 4k, phím tắt...)"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-950/80 border border-white/[0.1] focus:border-netflix-red/60 focus:bg-black text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-2xl backdrop-blur-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-gray-400 hover:text-white transition"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================= CATEGORY TABS ================= */}
        <section className="flex items-center justify-center gap-2 flex-wrap pb-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-netflix-red text-white shadow-lg shadow-red-950/50 scale-[1.02]"
                    : "bg-zinc-900/60 hover:bg-zinc-900 text-gray-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </section>

        {/* ================= ACCORDION LIST ================= */}
        <section className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-zinc-950/60 border border-white/[0.08] text-gray-400 space-y-3">
              <HelpCircle size={32} className="mx-auto text-gray-500 opacity-60" />
              <p className="text-sm font-medium">Không tìm thấy câu hỏi phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="text-xs text-netflix-red hover:underline font-semibold"
              >
                Xem tất cả câu hỏi
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredFAQs.map((faq) => {
                const isOpen = Boolean(openItems[faq.id]);
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl bg-zinc-950/80 border transition-all duration-300 overflow-hidden backdrop-blur-xl ${
                      isOpen ? "border-white/20 shadow-xl bg-zinc-900/40" : "border-white/[0.08] hover:border-white/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(faq.id)}
                      className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-mono text-netflix-red font-bold uppercase tracking-wider">
                          {faq.categoryLabel}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                      <div
                        className={`p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                          isOpen ? "rotate-180 bg-netflix-red/20 text-netflix-red border-red-500/30" : ""
                        }`}
                      >
                        <ChevronDown size={16} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-1 space-y-3 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/[0.05]">
                        <p>{faq.answer}</p>
                        {faq.tips && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                            <Sparkles size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>{faq.tips}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================= STILL NEED HELP CTA ================= */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-zinc-900/90 via-zinc-950 to-black border border-white/[0.1] backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-netflix-red text-xs font-bold uppercase tracking-wider">
              <LifeBuoy size={14} />
              <span>Chưa Tìm Thấy Lời Giải?</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Khám phá thêm về triết lý & câu chuyện của Nanaflix
            </h3>
            <p className="text-xs text-gray-400">
              Đọc thêm trang giới thiệu tác giả hoặc quay lại trải nghiệm kho phim.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center flex-shrink-0">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-bold text-white transition backdrop-blur-md"
            >
              <Film size={14} />
              <span>Về Nanaflix</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-red-950/50"
            >
              <Play size={14} className="fill-current" />
              <span>Khám Phá Phim Ngay</span>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
