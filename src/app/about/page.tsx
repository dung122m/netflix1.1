import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Sparkles,
  Bot,
  Tv,
  Heart,
  Clock,
  Cloud,
  Bell,
  ArrowLeft,
  Code2,
  Layers,
  Database,
  Zap,
  Server,
  Cpu,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Giới thiệu Nanaflix | Phát triển bởi Dũng Trần",
  description:
    "Nanaflix là nền tảng khám phá và xem phim trực tuyến cá nhân, được xây dựng nhằm mang đến trải nghiệm giải trí mượt mà, thông minh và cá nhân hóa. Được thiết kế và phát triển bởi Dũng Trần.",
};

const KEY_FEATURES = [
  {
    icon: Film,
    title: "Khám Phá Phim Đa Nguồn",
    tagline: "🎬 Kho phim phong phú & chuẩn hóa",
    description:
      "Tích hợp và chuẩn hóa dữ liệu phim từ nhiều nguồn với bộ lọc đa chiều theo thể loại, quốc gia, năm phát hành và phân loại phim.",
    accent: "from-red-500/20 to-orange-500/10",
    border: "border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-400",
  },
  {
    icon: Bot,
    title: "Trợ Lý AI & Tìm Kiếm Thông Minh",
    tagline: "🤖 Trợ lý AI Nana cá nhân",
    description:
      "Tìm kiếm bằng ngôn ngữ tự nhiên, gợi ý phim theo tâm trạng và bốc quẻ phim định mệnh với hệ thống AI đa tầng tự động fallback.",
    accent: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20 hover:border-purple-500/40",
    iconColor: "text-purple-400",
  },
  {
    icon: Sparkles,
    title: "Đề Xuất Chuẩn Gu Cá Nhân",
    tagline: "✨ Thuật toán Taste Profile",
    description:
      "Hệ thống phân tích thói quen xem phim đa chiều, tính điểm tương đồng theo thể loại, quốc gia, định dạng phim và diễn viên yêu thích.",
    accent: "from-amber-500/20 to-yellow-500/10",
    border: "border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
  {
    icon: Tv,
    title: "Trình Phát HLS Đa Nguồn Mượt Mà",
    tagline: "📺 Trải nghiệm điện ảnh chuẩn rạp",
    description:
      "Trình phát chất lượng cao tự động chuyển đổi độ phân giải, hỗ trợ chế độ rạp chiếu (Theater Mode), hẹn giờ tắt và phím tắt thông minh.",
    accent: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    icon: Heart,
    title: "Danh Sách Lưu & Theo Dõi Diễn Viên",
    tagline: "❤️ Lưu trữ & Tùy biến bộ sưu tập",
    description:
      "Lưu lại các tác phẩm yêu thích, tạo bộ sưu tập cá nhân và theo dõi diễn viên để nhận đề xuất phim mới nhất có sự tham gia của họ.",
    accent: "from-rose-500/20 to-red-500/10",
    border: "border-rose-500/20 hover:border-rose-500/40",
    iconColor: "text-rose-400",
  },
  {
    icon: Clock,
    title: "Lịch Sử Xem & Tiếp Tục Xem",
    tagline: "🕐 Ghi nhớ thời lượng chính xác",
    description:
      "Tự động ghi nhớ thời điểm và tập phim đang xem dở, đồng bộ tiến trình phát liền mạch giữa máy tính và điện thoại.",
    accent: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
  },
  {
    icon: Cloud,
    title: "Đồng Bộ Cấu Hình Phát Lại Cloud",
    tagline: "☁️ Lưu trữ tùy biến cá nhân",
    description:
      "Lưu trữ tốc độ phát, kiểu phụ đề, âm lượng và chế độ tự động chuyển tập an toàn trên đám mây cá nhân với công nghệ Supabase.",
    accent: "from-sky-500/20 to-indigo-500/10",
    border: "border-sky-500/20 hover:border-sky-500/40",
    iconColor: "text-sky-400",
  },
  {
    icon: Bell,
    title: "Thông Báo Tập Mới & Hoạt Động",
    tagline: "🔔 Cập nhật tức thì",
    description:
      "Hệ thống thông báo thời gian thực khi có tập phim mới của bộ phim đang theo dõi, phản hồi bình luận và các sự kiện đáng chú ý.",
    accent: "from-yellow-500/20 to-amber-500/10",
    border: "border-yellow-500/20 hover:border-yellow-500/40",
    iconColor: "text-yellow-400",
  },
];

const TECH_STACK = [
  {
    category: "Giao Diện & Kiến Trúc Frontend",
    icon: Layers,
    items: [
      { name: "Next.js 16 (App Router)", detail: "Server-side Rendering & Streaming SSR" },
      { name: "React 19", detail: "Hệ sinh thái component hiện đại, tối ưu hiệu năng" },
      { name: "TypeScript 5", detail: "Kiểm soát kiểu dữ liệu an toàn toàn diện" },
      { name: "Tailwind CSS v4", detail: "Ngôn ngữ thiết kế Dark Netflix độc quyền" },
    ],
  },
  {
    category: "Cơ Sở Dữ Liệu & Bộ Nhớ Đệm",
    icon: Database,
    items: [
      { name: "Supabase (PostgreSQL)", detail: "Xác thực tài khoản, Hồ sơ, Danh sách & RLS Security" },
      { name: "Upstash Redis", detail: "Bộ nhớ đệm phân tán L2 tốc độ cao" },
      { name: "Local-First Storage", detail: "Hoạt động mượt mà cả khi mất mạng tạm thời" },
    ],
  },
  {
    category: "Đa Phương Tiện & Trí Tuệ Nhân Tạo",
    icon: Cpu,
    items: [
      { name: "Động Cơ AI Đa Tầng", detail: "Tích hợp Groq, Mistral, Cloudflare Workers AI & Gemini" },
      { name: "Trình Phát HLS.js", detail: "Phát video bitrate thích ứng & tự phục hồi lỗi luồng" },
      { name: "Pipeline Tối Ưu Hình Ảnh", detail: "Chuyển đổi WebP nhẹ và tải nhanh qua Sharp proxy" },
      { name: "APIs Dữ Liệu Phim & TMDB", detail: "Chuẩn hóa và đồng bộ dữ liệu phim đa nguồn" },
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="flex-1 relative pt-24 sm:pt-28 pb-16 px-4 sm:px-8 md:px-12 max-w-6xl mx-auto w-full space-y-16 sm:space-y-24">
        {/* Background glow ambiance */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-64 bg-red-600/10 blur-[120px] pointer-events-none -z-10" />

        {/* HERO SECTION */}
        <section className="text-center space-y-6 sm:space-y-8 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse" />
            <span>Nền Tảng Điện Ảnh Cá Nhân</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
              Về <span className="text-netflix-red">Nanaflix</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 font-normal leading-relaxed">
              Nanaflix là nền tảng khám phá và xem phim trực tuyến cá nhân, được xây dựng nhằm mang đến trải nghiệm giải trí mượt mà, thông minh và chuẩn gu riêng của bạn.
            </p>
          </div>

          {/* CREATOR BADGE & ACTION BUTTONS */}
          <div className="flex flex-col items-center justify-center gap-5 pt-2">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-4 sm:px-6 sm:py-3.5 rounded-2xl bg-zinc-950/80 border border-white/15 backdrop-blur-xl shadow-2xl">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-netflix-red/60 shadow-lg relative flex-shrink-0">
                <Image
                  src="/images/nana-footer.jpg"
                  alt="Dũng Trần"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                  Được thiết kế & phát triển bởi
                </div>
                <div className="text-base sm:text-lg font-black text-white flex items-center justify-center sm:justify-start gap-1.5">
                  <span>Dũng Trần</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-semibold">
                    Full-stack Developer
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 flex-wrap justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg shadow-red-950/50 active:scale-95"
              >
                <ArrowLeft size={16} />
                <span>Khám Phá Phim</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ABOUT THE PROJECT SECTION */}
        <section className="space-y-6">
          <div className="border-t border-white/10 pt-10">
            <div className="flex items-center gap-2 text-netflix-red text-xs uppercase font-bold tracking-wider mb-2">
              <Code2 size={14} />
              <span>Tổng Quan Dự Án</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Về Dự Án Nanaflix
            </h2>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-md space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white font-bold">Nanaflix</strong> là ứng dụng xem phim và khám phá giải trí trực tuyến, được thiết kế theo phong cách rạp chiếu phim hiện đại lấy cảm hứng từ Netflix, với định hướng tối ưu hóa toàn diện trải nghiệm người dùng:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Khám phá kho phim đa nguồn phong phú & chuẩn hóa</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Đề xuất thông minh theo gu cá nhân (Taste Profile)</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Trình phát video HLS mượt mà, thích ứng thông minh</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Tự động lưu lịch sử & tiếp tục xem trên mọi thiết bị</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Quản lý danh sách yêu thích & bộ sưu tập cá nhân</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-200">
                <CheckCircle2 size={16} className="text-netflix-red shrink-0" />
                <span>Theo dõi diễn viên yêu thích & nhận thông báo phim mới</span>
              </div>
            </div>
          </div>
        </section>

        {/* KEY FEATURES SECTION */}
        <section className="space-y-6">
          <div className="border-t border-white/10 pt-10">
            <div className="flex items-center gap-2 text-netflix-red text-xs uppercase font-bold tracking-wider mb-2">
              <Zap size={14} />
              <span>Khả Năng Vượt Trội</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tính Năng Nổi Bật
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {KEY_FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl bg-zinc-950/70 border ${f.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-zinc-900/80 flex flex-col justify-between space-y-3 group`}
                >
                  <div className="space-y-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} ${f.iconColor} flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="text-xs font-semibold text-gray-400">{f.tagline}</div>
                    <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                      {f.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* BUILT WITH SECTION */}
        <section className="space-y-6">
          <div className="border-t border-white/10 pt-10">
            <div className="flex items-center gap-2 text-netflix-red text-xs uppercase font-bold tracking-wider mb-2">
              <Server size={14} />
              <span>Nền Tảng Kỹ Thuật</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Công Nghệ Sử Dụng
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TECH_STACK.map((group, idx) => {
              const Icon = group.icon;
              return (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-4 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2.5 text-white font-bold text-sm pb-2 border-b border-white/10">
                    <Icon size={16} className="text-netflix-red" />
                    <span>{group.category}</span>
                  </div>
                  <ul className="space-y-3">
                    {group.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="space-y-0.5">
                        <div className="text-xs font-bold text-gray-200">{item.name}</div>
                        <div className="text-[11px] text-gray-400">{item.detail}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="border-t border-white/10 pt-10 pb-4 text-center">
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-zinc-900/60 to-black border border-white/15 relative overflow-hidden space-y-5">
            <div className="space-y-2 max-w-xl mx-auto">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Sẵn sàng khám phá thế giới điện ảnh Nanaflix?
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Thưởng thức hàng ngàn bộ phim bom tấn, phim bộ dài tập cùng hệ thống gợi ý thông minh ngay hôm nay.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-sm transition-all shadow-lg active:scale-95"
              >
                <Compass size={16} />
                <span>Bắt Đầu Khám Phá</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
