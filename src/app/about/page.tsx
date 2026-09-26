import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Sparkles,
  Bot,
  Tv,
  Compass,
  Layers,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  Play,
  HeartHandshake,
  MonitorSmartphone,
  Flame,
  CheckCircle,
  Mail,
  MessageSquare,
  AlertTriangle,
  Send,
  HelpCircle,
  Clock,
  Radio,
  ExternalLink,
  Code2,
  Lock,
  Globe,
  Milestone,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Giới Thiệu Nanaflix | Không Gian Điện Ảnh Thuần Khiết & Công Nghệ Trực Tuyến",
  description:
    "Tìm hiểu về Nanaflix — Nền tảng xem phim trực tuyến phi thương mại tối ưu tốc độ, không quảng cáo phiền toái, hỗ trợ HLS thích ứng đa thiết bị và trợ lý AI thông minh.",
};

const PILLARS = [
  {
    number: "01",
    title: "Trình Phát Chuẩn Rạp Chiếu",
    subtitle: "HLS Adaptive Streaming & Auto-Fallback",
    description:
      "Hệ thống phát video phân giải cao tự động cân bằng bitrate theo băng thông mạng. Hỗ trợ đầy đủ Theater Mode, tua phím tắt tốc độ cao, ghi nhớ âm lượng và tự động chuyển đổi máy chủ dự phòng khi gặp sự cố nghẽn mạng.",
    badge: "Mượt mà • 4K/FHD",
    gradient: "from-rose-500/20 via-red-500/10 to-transparent",
    border: "border-red-500/20 hover:border-red-500/40",
    icon: Tv,
    iconColor: "text-red-400",
  },
  {
    number: "02",
    title: "Tiếp Tục Xem Đa Thiết Bị",
    subtitle: "Realtime Progress Sync & Cloud Handoff",
    description:
      "Xem dở bộ phim trên máy tính làm việc ban ngày, tối về mở điện thoại là tiếp tục đúng từng giây và tập phim đang dừng. Cơ chế đồng bộ đám mây Supabase tức thì giúp trải nghiệm liền mạch không ngắt quãng.",
    badge: "Tự động đồng bộ",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    border: "border-amber-500/20 hover:border-amber-500/40",
    icon: MonitorSmartphone,
    iconColor: "text-amber-400",
  },
  {
    number: "03",
    title: "Trợ Lý AI & Gợi Ý Đúng Gu",
    subtitle: "Taste Profile & Natural Language Discovery",
    description:
      "Không còn phải lướt hàng chục trang tìm phim mà không biết xem gì. Trợ lý AI Nana hiểu ngữ cảnh tâm trạng, hỗ trợ bốc quẻ phim ngẫu nhiên và phân tích sâu theo diễn viên, đạo diễn cùng gu thưởng thức cá nhân hóa.",
    badge: "AI Nana cá nhân",
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    border: "border-purple-500/20 hover:border-purple-500/40",
    icon: Bot,
    iconColor: "text-purple-400",
  },
  {
    number: "04",
    title: "Không Gian Sạch & Tôn Trọng Người Xem",
    subtitle: "Zero Spam, Zero Popups, Pure Cinema",
    description:
      "Tuyệt đối nói không với các loại banner cờ bạc, pop-up nhảy tab khó chịu hay quảng cáo chèn ngang cao trào phim. Mọi chi tiết giao diện được thiết kế tối giản, êm mắt để bạn tập trung trọn vẹn vào cảm xúc điện ảnh.",
    badge: "100% Giao diện sạch",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
  },
];

const TECH_SPECS = [
  {
    title: "Trải Nghiệm & Giao Diện Hiện Đại",
    icon: Layers,
    items: [
      { name: "Next.js 16 (App Router)", desc: "Kiến trúc Server Components & Streaming SSR tối ưu hóa tốc độ tải trang ban đầu" },
      { name: "React 19 & TypeScript", desc: "Mã nguồn chặt chẽ, type-safe toàn diện và tối ưu hóa bộ nhớ trình duyệt" },
      { name: "Cinematic Dark Theme", desc: "Tương phản thị giác cao cấp, hạn chế mỏi mắt khi xem phim trong không gian tối" },
      { name: "Progressive Web App (PWA)", desc: "Hỗ trợ cài đặt trực tiếp lên iPhone/Android với trải nghiệm toàn màn hình như app gốc" },
    ],
  },
  {
    title: "Dữ Liệu & Hạ Tầng Phân Tán",
    icon: Database,
    items: [
      { name: "Supabase (PostgreSQL)", desc: "Quản lý hồ sơ tài khoản, danh sách phim yêu thích & phân quyền dữ liệu RLS nghiêm ngặt" },
      { name: "Upstash Redis L2 Cache", desc: "Bộ đệm phân tán toàn cầu, phản hồi truy vấn siêu nhanh và giảm tải máy chủ gốc" },
      { name: "Local-First Architecture", desc: "Lưu trữ cục bộ thông minh, giữ cấu hình phát và lịch sử xem ngay cả khi mạng chập chờn" },
      { name: "Global CDN Edge", desc: "Phân phối hình ảnh, poster và tài nguyên tĩnh từ các node máy chủ gần người dùng nhất" },
    ],
  },
  {
    title: "Trình Phát & Trí Tuệ Nhân Tạo",
    icon: Cpu,
    items: [
      { name: "HLS.js Video Streaming Engine", desc: "Bộ giải mã luồng video thích ứng bitrate tự động theo thời gian thực" },
      { name: "Multi-Model AI Orchestrator", desc: "Kết hợp linh hoạt Google Gemini, Groq & Mistral cho tốc độ suy luận nhanh chóng" },
      { name: "TMDB Data Normalization", desc: "Đồng bộ và chuẩn hóa thông tin phim, danh sách diễn viên, đạo diễn chuẩn quốc tế" },
      { name: "Realtime Device Handoff", desc: "Truyền tiếp phiên xem dở giữa các thiết bị với độ trễ cực thấp" },
    ],
  },
];

const ROADMAP_STEPS = [
  {
    phase: "Giai đoạn 1",
    title: "Nền Tảng Cốt Lõi",
    status: "Đã hoàn thành",
    desc: "Xây dựng trình phát HLS chuẩn rạp, kho phim đa dạng, danh mục phân loại chi tiết và giao diện tối giản chuẩn điện ảnh.",
  },
  {
    phase: "Giai đoạn 2",
    title: "Đồng Bộ & Trợ Lý AI",
    status: "Đã hoàn thành",
    desc: "Ra mắt tính năng đồng bộ tiến trình đa thiết bị, Taste Profile cá nhân hóa, trợ lý bốc quẻ và tìm kiếm ngữ nghĩa tự nhiên.",
  },
  {
    phase: "Giai đoạn 3",
    title: "Trải Nghiệm Trực Tiếp & Cộng Đồng",
    status: "Đang phát triển",
    desc: "Bổ sung tính năng Watch Party (xem chung cùng bạn bè theo thời gian thực), kênh Live thể thao/sự kiện và bình luận thảo luận văn minh.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW EFFECTS */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.15),rgba(0,0,0,0))] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,51,234,0.06),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-6xl mx-auto w-full space-y-20 sm:space-y-28">
        
        {/* ================= 1. HERO SECTION ================= */}
        <section className="text-center space-y-8 relative">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-xs font-semibold text-gray-300 shadow-2xl hover:border-white/20 transition">
            <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse" />
            <span>Nền Tảng Điện Ảnh Phi Thương Mại Cá Nhân Hóa</span>
          </div>

          {/* Main Title */}
          <div className="space-y-5 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08]">
              Xem phim theo cách bạn{" "}
              <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                xứng đáng
              </span>{" "}
              thưởng thức.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 font-normal leading-relaxed max-w-2xl mx-auto">
              Một không gian điện ảnh trực tuyến thuần khiết: 100% không quảng cáo rác, tốc độ phản hồi tính bằng mili-giây và tự động ghi nhớ chính xác từng giây bạn đã xem dở.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-white">0 Giây</div>
              <div className="text-[11px] text-gray-400 font-medium">Quảng cáo phiền phức</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-red-400">Adaptive</div>
              <div className="text-[11px] text-gray-400 font-medium">Tự động Full HD / 4K</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-amber-400">Realtime</div>
              <div className="text-[11px] text-gray-400 font-medium">Đồng bộ đa thiết bị</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">100% Free</div>
              <div className="text-[11px] text-gray-400 font-medium">Phi lợi nhuận vì đam mê</div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-sm transition-all shadow-xl shadow-red-950/50 hover:shadow-red-600/30 hover:scale-[1.02] active:scale-95"
            >
              <Play size={16} className="fill-current" />
              <span>Khám Phá Phim Ngay</span>
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-gray-200 font-semibold text-sm transition-all backdrop-blur-md hover:border-white/20 active:scale-95"
            >
              <MessageSquare size={16} />
              <span>Trợ Giúp & Báo Lỗi</span>
            </a>
          </div>
        </section>

        {/* ================= 2. FOUNDER'S STORY & PHILOSOPHY ================= */}
        <section className="relative">
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-black border border-white/[0.1] backdrop-blur-2xl shadow-2xl relative overflow-hidden space-y-8">
            {/* Top Tag */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.08] pb-6">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-netflix-red">
                <Flame size={16} />
                <span>Câu Chuyện Phía Sau Màn Ảnh</span>
              </div>
              <span className="text-xs text-gray-500 font-mono">Nanaflix Project • Est. 2024</span>
            </div>

            {/* Note Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Text Column */}
              <div className="lg:col-span-8 space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed font-normal">
                <p className="text-lg sm:text-xl text-white font-medium leading-snug">
                  Nanaflix được bắt đầu rất giản dị: Từ mong muốn có một không gian xem phim <span className="text-netflix-red font-semibold">thực sự trọn vẹn và tĩnh lặng</span> sau mỗi ngày làm việc căng thẳng.
                </p>
                <p>
                  Chắc hẳn bạn cũng từng trải qua cảm giác cụt hứng khi chuẩn bị thưởng thức một tác phẩm điện ảnh yêu thích nhưng liên tục bị bủa vây bởi các biểu ngữ quảng cáo cá cược nhấp nháy, đường dẫn nhảy tab độc hại, hoặc video cứ xem được 5 phút lại bị giật đứng hình.
                </p>
                <p>
                  Đó là lý do Nanaflix ra đời — một nền tảng được đẽo gọt tỉ mỉ kết hợp giữa công nghệ streaming HLS hiện đại, kiến trúc đám mây thông minh và triết lý thiết kế hướng đến người dùng. Ở đây, bạn chỉ cần bấm Play là phim chạy mượt mà, ghi nhớ chuẩn xác từng phút từng giây bạn dừng lại trên mọi thiết bị và hoàn toàn không có bất kỳ phiền toái nào chen ngang.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <span className="text-emerald-400 font-bold">●</span> Xây dựng với tình yêu điện ảnh và tinh thần mã nguồn mở vì cộng đồng.
                </div>
              </div>

              {/* Creator Card Column */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="w-full max-w-sm p-6 rounded-2xl bg-black/60 border border-white/[0.1] space-y-4 text-center backdrop-blur-xl relative group hover:border-white/20 transition-all">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden border-2 border-netflix-red/70 shadow-2xl relative">
                    <Image
                      src="/images/nana-footer.jpg"
                      alt="Dũng Trần"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Dũng Trần</h3>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">Creator & Full-stack Engineer</p>
                  </div>
                  <div className="text-[11px] text-gray-400 leading-normal border-t border-white/[0.06] pt-3">
                    &ldquo;Sự hài lòng và những phút giây thư giãn của bạn là nguồn động lực lớn nhất để dự án không ngừng hoàn thiện mỗi ngày.&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. 4 CORE PILLARS ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-netflix-red">
              <Zap size={14} />
              <span>Trải Nghiệm Khác Biệt</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              4 Giá Trị Cốt Lõi Tạo Nên Sự Khác Biệt
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Từng dòng code và quyết định thiết kế đều hướng tới mục tiêu tối đa hóa trải nghiệm giải trí của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.number}
                  className={`p-7 rounded-3xl bg-gradient-to-b from-zinc-950/90 to-black border ${p.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden group`}
                >
                  <div
                    className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${p.gradient} blur-3xl pointer-events-none -z-10 group-hover:opacity-100 transition-opacity`}
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] ${p.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                      >
                        <Icon size={22} />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300 font-mono">
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">{p.subtitle}</div>
                      <h3 className="text-xl font-bold text-white mt-1 group-hover:text-red-400 transition-colors">
                        {p.title}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-500 font-mono">
                    <span>Đặc trưng #{p.number}</span>
                    <span className="text-gray-400">Nanaflix Experience</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 4. TECH STACK & ARCHITECTURE ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-netflix-red">
              <Cpu size={14} />
              <span>Dưới Nắp Capo Kỹ Thuật</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Công Nghệ & Kiến Trúc Hệ Thống
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Ứng dụng các công nghệ web hiện đại nhất hiện nay nhằm mang lại tốc độ phản hồi sub-millisecond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TECH_SPECS.map((spec, idx) => {
              const Icon = spec.icon;
              return (
                <div
                  key={idx}
                  className="p-6 sm:p-7 rounded-3xl bg-zinc-950/70 border border-white/[0.08] hover:border-white/20 transition backdrop-blur-xl space-y-5"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                    <div className="p-2 rounded-xl bg-netflix-red/10 text-netflix-red">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-bold text-white text-sm">{spec.title}</h3>
                  </div>

                  <div className="space-y-4">
                    {spec.items.map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-netflix-red shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 pl-4 leading-relaxed">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 5. ROADMAP & EVOLUTION ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Milestone size={14} />
              <span>Hành Trình Phát Triển</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Lộ Trình & Tầm Nhìn Dự Án
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Nanaflix liên tục được tinh chỉnh và nâng cấp tính năng định kỳ hàng tuần.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ROADMAP_STEPS.map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-zinc-950/60 border border-white/[0.08] space-y-3 backdrop-blur-md relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-gray-400">{step.phase}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    step.status === "Đã hoàn thành" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {step.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 6. HELP & ISSUE REPORTING CENTER (SECTION #CONTACT) ================= */}
        <section id="contact" className="scroll-mt-28 space-y-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/[0.12] backdrop-blur-2xl shadow-2xl relative overflow-hidden space-y-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-wider uppercase">
                <MessageSquare size={14} />
                <span>Trung Tâm Trợ Giúp & Báo Lỗi Kỹ Thuật</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bạn Gặp Sự Cố Hoặc Cần Hỗ Trợ?
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Chúng tôi luôn lắng nghe mọi đóng góp, phản hồi về chất lượng đường truyền video, lỗi hiển thị hoặc yêu cầu bổ sung phim mới từ bạn.
              </p>
            </div>

            {/* 3 Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Channel 1: Báo lỗi phim & phát video */}
              <div className="p-6 rounded-2xl bg-black/50 border border-white/[0.08] hover:border-red-500/40 transition space-y-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Báo Lỗi Phim & Máy Chủ</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Phim bị đứng hình, link phát hỏng, mất tiếng hoặc lệch phụ đề? Gửi thông tin tên phim và tập phim bị ảnh hưởng.
                  </p>
                </div>
                <a
                  href="mailto:contact@nanaflix.id.vn?subject=[Bao%20Loi%20Phim]%20Nanaflix%20Issue%20Report"
                  className="inline-flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition"
                >
                  <Mail size={13} />
                  <span>Gửi email báo lỗi link</span>
                </a>
              </div>

              {/* Channel 2: Góp ý tính năng & Yêu cầu phim */}
              <div className="p-6 rounded-2xl bg-black/50 border border-white/[0.08] hover:border-purple-500/40 transition space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Yêu Cầu Phim & Tính Năng</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Mong muốn bổ sung bộ phim bạn yêu thích hoặc có sáng kiến cải tiến giao diện Nanaflix ngày một hoàn thiện hơn.
                  </p>
                </div>
                <a
                  href="mailto:contact@nanaflix.id.vn?subject=[Yeu%20Cau%20Phim]%20De%20xuat%20noi%20dung%20moi"
                  className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                >
                  <Send size={13} />
                  <span>Gửi đề xuất tới tác giả</span>
                </a>
              </div>

              {/* Channel 3: Hỗ trợ tài khoản & Bản quyền */}
              <div className="p-6 rounded-2xl bg-black/50 border border-white/[0.08] hover:border-emerald-500/40 transition space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Tài Khoản & Bản Quyền DMCA</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Thắc mắc về bảo mật dữ liệu, yêu cầu xóa tài khoản hoặc khiếu nại bản quyền tác giả theo tiêu chuẩn DMCA.
                  </p>
                </div>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <ExternalLink size={13} />
                  <span>Xem quy trình DMCA</span>
                </Link>
              </div>
            </div>

            {/* Direct Contact Banner */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span>Thời gian phản hồi thông thường: 1 - 24 giờ làm việc</span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Hộp thư trực tiếp: <span className="font-mono text-zinc-300 font-semibold">contact@nanaflix.id.vn</span> hoặc liên hệ qua trang cá nhân.
                </div>
              </div>

              <a
                href="mailto:contact@nanaflix.id.vn"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition shadow-lg shrink-0"
              >
                <Mail size={14} />
                <span>Gửi Email Ngay</span>
              </a>
            </div>
          </div>
        </section>

        {/* ================= 7. CROSS LINKS & CINEMA CTA ================= */}
        <section className="text-center space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/faq"
              className="p-5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900 border border-white/[0.08] hover:border-amber-500/40 transition text-left group"
            >
              <div className="text-xs font-mono text-amber-400 font-bold uppercase">Câu hỏi & Hướng dẫn</div>
              <div className="text-sm font-bold text-white group-hover:text-amber-300 transition mt-1">Trang Hỏi & Đáp (FAQ)</div>
              <div className="text-xs text-gray-400 mt-1">Bí kíp cài app PWA, cast TV và phím tắt nhanh.</div>
            </Link>

            <Link
              href="/privacy"
              className="p-5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900 border border-white/[0.08] hover:border-emerald-500/40 transition text-left group"
            >
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase">An toàn dữ liệu</div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition mt-1">Chính Sách Bảo Mật</div>
              <div className="text-xs text-gray-400 mt-1">Không lưu Raw IP, mã hóa RLS và tự chủ dữ liệu.</div>
            </Link>

            <Link
              href="/terms"
              className="p-5 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900 border border-white/[0.08] hover:border-blue-500/40 transition text-left group"
            >
              <div className="text-xs font-mono text-blue-400 font-bold uppercase">Quy định & DMCA</div>
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition mt-1">Điều Khoản Dịch Vụ</div>
              <div className="text-xs text-gray-400 mt-1">Tuyên bố miễn trừ lưu trữ và tiếp nhận bản quyền.</div>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
