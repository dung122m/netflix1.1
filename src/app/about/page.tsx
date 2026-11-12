import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Compass,
  Tv,
  Layers,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  Play,
  MonitorSmartphone,
  Flame,
  CheckCircle,
  Mail,
  MessageSquare,
  AlertTriangle,
  Send,
  Clock,
  ExternalLink,
  Milestone,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Giới Thiệu Nanaflix | Không Gian Điện Ảnh Thuần Khiết & Công Nghệ Trực Tuyến",
  description:
    "Tìm hiểu về Nanaflix — Nền tảng xem phim trực tuyến phi thương mại tối ưu tốc độ, không quảng cáo phiền toái, hỗ trợ HLS thích ứng đa thiết bị và gợi ý phim thông minh.",
};

const PILLARS = [
  {
    number: "01",
    title: "Trình Phát Chuẩn Rạp Chiếu",
    subtitle: "HLS Adaptive Streaming & Auto-Fallback",
    description:
      "Hệ thống phát video phân giải cao tự động cân bằng bitrate theo băng thông mạng. Hỗ trợ đầy đủ Theater Mode, tua phím tắt tốc độ cao, ghi nhớ âm lượng và tự động chuyển đổi máy chủ dự phòng khi gặp sự cố nghẽn mạng.",
    badge: "Mượt mà • Chuẩn FHD",
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
    title: "Gợi Ý Đúng Gu & Khám Phá Thông Minh",
    subtitle: "Taste Profile & Smart Content Discovery",
    description:
      "Không còn phải lướt hàng chục trang tìm phim mà không biết xem gì. Hệ thống phân tích gu thưởng thức thông minh dựa trên lịch sử xem, tự động đề xuất các bộ phim tương thích cao nhất theo diễn viên, đạo diễn và thể loại ưa thích.",
    badge: "Gợi ý cá nhân hóa",
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    border: "border-purple-500/20 hover:border-purple-500/40",
    icon: Compass,
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
    desc: "Ra mắt tính năng đồng bộ tiến trình đa thiết bị, Taste Profile cá nhân hóa, hệ thống gợi ý thông minh và tìm kiếm ngữ nghĩa tự nhiên.",
  },
  {
    phase: "Giai đoạn 3",
    title: "Trải Nghiệm Trực Tiếp & Cộng Đồng",
    status: "Đang phát triển",
    desc: "Hoàn thiện kênh Live truyền hình, trực tiếp thể thao với bảng xếp hạng, lịch thi đấu và bình luận thảo luận cộng đồng văn minh.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[#050505] text-zinc-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-clip">
      <Navbar />

      <main className="flex-1 pt-24 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-6xl mx-auto w-full space-y-20 sm:space-y-28">

        {/* ================= 1. HERO SECTION ================= */}
        <section className="text-center space-y-8 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] text-xs font-medium text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />
            <span>Nền Tảng Điện Ảnh Phi Thương Mại Cá Nhân Hóa</span>
          </div>

          {/* Main Title */}
          <div className="space-y-5 max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] text-balance">
              Xem phim theo cách bạn{" "}
              <span className="text-netflix-red">
                xứng đáng
              </span>{" "}
              thưởng thức.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-zinc-400 font-normal leading-relaxed max-w-2xl mx-auto">
              Một không gian điện ảnh trực tuyến thuần khiết: 100% không quảng cáo rác, tốc độ phản hồi tính bằng mili-giây và tự động ghi nhớ chính xác từng giây bạn đã xem dở.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
            <div className="p-4 rounded-2xl bg-zinc-900/55 text-center space-y-1">
              <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">0 Giây</div>
              <div className="text-xs text-zinc-400">Quảng cáo phiền phức</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/55 text-center space-y-1">
              <div className="text-xl sm:text-2xl font-bold text-white">Adaptive</div>
              <div className="text-xs text-zinc-400">Tự động Full HD / 4K</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/55 text-center space-y-1">
              <div className="text-xl sm:text-2xl font-bold text-white">Realtime</div>
              <div className="text-xs text-zinc-400">Đồng bộ đa thiết bị</div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-900/55 text-center space-y-1">
              <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">100% Free</div>
              <div className="text-xs text-zinc-400">Phi lợi nhuận vì đam mê</div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-sm transition-all shadow-md shadow-black/50 hover:scale-[1.02] active:scale-95"
            >
              <Play size={16} className="fill-current" />
              <span>Khám Phá Phim Ngay</span>
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] text-zinc-200 font-semibold text-sm transition-all active:scale-95"
            >
              <MessageSquare size={16} />
              <span>Trợ Giúp & Báo Lỗi</span>
            </a>
          </div>
        </section>

        {/* ================= 2. FOUNDER'S STORY & PHILOSOPHY ================= */}
        <section className="relative">
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-zinc-900/50 relative overflow-hidden space-y-6">
            {/* Top Tag */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-netflix-red">
                <Flame size={15} />
                <span>Câu chuyện phía sau màn ảnh</span>
              </div>
              <span className="text-xs text-zinc-500 font-sans tabular-nums">Nanaflix Project • Est. 2026</span>
            </div>

            {/* Note Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
              {/* Text Column */}
              <div className="lg:col-span-8 space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                <p className="text-lg sm:text-xl text-white font-medium leading-snug">
                  Nanaflix được bắt đầu rất giản dị: Từ mong muốn có một không gian xem phim <span className="text-netflix-red font-semibold">thực sự trọn vẹn và tĩnh lặng</span> sau mỗi ngày làm việc căng thẳng.
                </p>
                <p>
                  Chắc hẳn bạn cũng từng trải qua cảm giác cụt hứng khi chuẩn bị thưởng thức một tác phẩm điện ảnh yêu thích nhưng liên tục bị bủa vây bởi các biểu ngữ quảng cáo cá cược nhấp nháy, đường dẫn nhảy tab độc hại, hoặc video cứ xem được 5 phút lại bị giật đứng hình.
                </p>
                <p>
                  Đó là lý do Nanaflix ra đời — một nền tảng được đẽo gọt tỉ mỉ kết hợp giữa công nghệ streaming HLS hiện đại, kiến trúc đám mây thông minh và triết lý thiết kế hướng đến người dùng. Ở đây, bạn chỉ cần bấm Play là phim chạy mượt mà, ghi nhớ chuẩn xác từng phút từng giây bạn dừng lại trên mọi thiết bị và hoàn toàn không có bất kỳ phiền toái nào chen ngang.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-zinc-400 font-sans tabular-nums">
                  <span className="text-emerald-400 font-bold">●</span> Xây dựng với tình yêu điện ảnh và tinh thần mã nguồn mở vì cộng đồng.
                </div>
              </div>

              {/* Creator Card Column */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-950/80 space-y-4 text-center relative group transition-all">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden shadow-2xl relative bg-[#da251d] shadow-black/60">
                    <Image
                      src="/images/vietnam-flag.svg"
                      alt="Cờ đỏ sao vàng Việt Nam"
                      width={96}
                      height={96}
                      unoptimized
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">DT</h3>
                    <p className="text-xs font-medium text-zinc-400 mt-0.5">Creator & Full-stack Engineer</p>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-normal border-t border-white/[0.06] pt-3">
                    &ldquo;Sự hài lòng và những phút giây thư giãn của bạn là nguồn động lực lớn nhất để dự án không ngừng hoàn thiện mỗi ngày.&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 3. 4 CORE PILLARS ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-netflix-red">
              <Zap size={14} />
              <span>Trải nghiệm khác biệt</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              4 Giá Trị Cốt Lõi Tạo Nên Sự Khác Biệt
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Từng dòng code và quyết định thiết kế đều hướng tới mục tiêu tối đa hóa trải nghiệm giải trí của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.number}
                  className="p-6 sm:p-7 rounded-2xl bg-zinc-900/55 hover:bg-zinc-900/80 transition-colors flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-white/[0.05] ${p.iconColor} flex items-center justify-center group-hover:scale-105 transition-transform`}
                      >
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/[0.05] text-zinc-300 font-sans tabular-nums">
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-zinc-500">{p.subtitle}</div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                        {p.title}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 4. TECH STACK & ARCHITECTURE ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-netflix-red">
              <Cpu size={14} />
              <span>Kiến trúc nền tảng</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Công Nghệ & Kiến Trúc Hệ Thống
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Ứng dụng các công nghệ web hiện đại nhất hiện nay nhằm mang lại tốc độ phản hồi sub-millisecond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TECH_SPECS.map((spec, idx) => {
              const Icon = spec.icon;
              return (
                <div
                  key={idx}
                  className="p-6 sm:p-7 rounded-2xl bg-zinc-900/55 space-y-5"
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
                        <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-netflix-red shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 pl-4 leading-relaxed">{item.desc}</div>
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
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Milestone size={14} />
              <span>Hành trình phát triển</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Lộ Trình & Tầm Nhìn Dự Án
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Nanaflix liên tục được tinh chỉnh và nâng cấp tính năng định kỳ hàng tuần.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ROADMAP_STEPS.map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-zinc-900/55 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans tabular-nums font-bold text-zinc-400">{step.phase}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    step.status === "Đã hoàn thành" 
                      ? "bg-emerald-500/10 text-emerald-400 "
                      : "bg-amber-500/10 text-amber-400 "
                  }`}>
                    {step.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 6. HELP & ISSUE REPORTING CENTER (SECTION #CONTACT) ================= */}
        <section id="contact" className="scroll-mt-28 space-y-8">
          <div className="py-8 sm:py-12 space-y-8 border-t border-white/[0.08]">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold">
                <MessageSquare size={14} />
                <span>Trung tâm trợ giúp & báo lỗi kỹ thuật</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Bạn Gặp Sự Cố Hoặc Cần Hỗ Trợ?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Chúng tôi luôn lắng nghe mọi đóng góp, phản hồi về chất lượng đường truyền video, lỗi hiển thị hoặc yêu cầu bổ sung phim mới từ bạn.
              </p>
            </div>

            {/* 3 Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Channel 1: Báo lỗi phim & phát video */}
              <div className="p-6 rounded-2xl bg-zinc-900/55 hover:bg-zinc-900/80 transition-colors space-y-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Báo Lỗi Phim & Máy Chủ</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
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
              <div className="p-6 rounded-2xl bg-zinc-900/55 hover:bg-zinc-900/80 transition-colors space-y-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Film size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Yêu Cầu Phim & Tính Năng</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
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
              <div className="p-6 rounded-2xl bg-zinc-900/55 hover:bg-zinc-900/80 transition-colors space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">Tài Khoản & Bản Quyền DMCA</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
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
            <div className="p-5 rounded-2xl bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span>Thời gian phản hồi thông thường: 1 - 24 giờ làm việc</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Hộp thư trực tiếp: <span className="font-sans tabular-nums text-zinc-300 font-semibold">contact@nanaflix.id.vn</span> hoặc liên hệ qua trang cá nhân.
                </div>
              </div>

              <a
                href="mailto:contact@nanaflix.id.vn"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-xs transition shadow-lg shrink-0"
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
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors text-left group"
            >
              <div className="text-xs text-amber-400 font-semibold">Câu hỏi & hướng dẫn</div>
              <div className="text-sm font-bold text-white group-hover:text-amber-300 transition mt-1">Trang Hỏi & Đáp (FAQ)</div>
              <div className="text-xs text-zinc-400 mt-1">Bí kíp cài app PWA, cast TV và phím tắt nhanh.</div>
            </Link>

            <Link
              href="/privacy"
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors text-left group"
            >
              <div className="text-xs text-emerald-400 font-semibold">An toàn dữ liệu</div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition mt-1">Chính Sách Bảo Mật</div>
              <div className="text-xs text-zinc-400 mt-1">Không lưu Raw IP, mã hóa RLS và tự chủ dữ liệu.</div>
            </Link>

            <Link
              href="/terms"
              className="p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors text-left group"
            >
              <div className="text-xs text-blue-400 font-semibold">Quy định & DMCA</div>
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition mt-1">Điều Khoản Dịch Vụ</div>
              <div className="text-xs text-zinc-400 mt-1">Tuyên bố miễn trừ lưu trữ và tiếp nhận bản quyền.</div>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
