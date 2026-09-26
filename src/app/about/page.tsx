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
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Về Nanaflix | Không Gian Điện Ảnh Thuần Khiết",
  description:
    "Nanaflix là nền tảng xem phim trực tuyến cá nhân do Dũng Trần phát triển — Không quảng cáo rác, trình phát HLS chuẩn rạp, đồng bộ tiến trình thông minh và giao diện tối giản sang trọng.",
};

const PILLARS = [
  {
    number: "01",
    title: "Trình Phát Chuẩn Rạp Chiếu",
    subtitle: "HLS Adaptive Streaming & Auto-Fallback",
    description:
      "Tự động cân chỉnh chất lượng video theo tốc độ mạng, không làm gián đoạn cảm xúc. Hỗ trợ đầy đủ Theater Mode, tua phím tắt nhanh và tự chuyển server dự phòng khi gặp sự cố mạng.",
    badge: "Mượt mà • 4K/FHD",
    gradient: "from-rose-500/20 via-red-500/10 to-transparent",
    border: "border-red-500/20 hover:border-red-500/40",
    icon: Tv,
    iconColor: "text-red-400",
  },
  {
    number: "02",
    title: "Tiếp Tục Xem Đa Thiết Bị",
    subtitle: "Realtime Progress Sync & Device Handoff",
    description:
      "Xem dở trên máy tính ở công ty, tối về mở điện thoại là tiếp tục đúng giây đang dừng. Hệ thống tự động ghi nhớ vị trí từng tập phim mà bạn không cần phải bận tâm ghi chú.",
    badge: "Tự động đồng bộ",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    border: "border-amber-500/20 hover:border-amber-500/40",
    icon: MonitorSmartphone,
    iconColor: "text-amber-400",
  },
  {
    number: "03",
    title: "Trợ Lý AI & Gợi Ý Đúng Gu",
    subtitle: "Taste Profile & Natural Language Search",
    description:
      "Không còn cảnh lướt 30 phút mà chưa chọn được phim. Trợ lý AI Nana hiểu tâm trạng, bốc quẻ phim ngẫu nhiên và phân tích sâu sắc theo diễn viên, đạo diễn bạn yêu thích.",
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
      "Nói không với các thể loại banner cờ bạc, pop-up nhảy trang khó chịu hay quảng cáo chèn ngang video. Mọi pixel được thiết kế để bạn đắm chìm trọn vẹn vào câu chuyện trên màn ảnh.",
    badge: "100% Giao diện sạch",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
  },
];

const TECH_SPECS = [
  {
    title: "Trải Nghiệm & Giao Diện",
    icon: Layers,
    items: [
      { name: "Next.js 16 (App Router)", desc: "Server Components & Streaming SSR tức thì" },
      { name: "React 19 & TypeScript", desc: "Mã nguồn hiện đại, an toàn và tối ưu hiệu năng" },
      { name: "Cinematic Dark Theme", desc: "Ngôn ngữ thiết kế tương phản cao, êm mắt khi xem đêm" },
    ],
  },
  {
    title: "Lưu Trữ & Dữ Liệu Tốc Độ Cao",
    icon: Database,
    items: [
      { name: "Supabase (PostgreSQL)", desc: "Quản lý tài khoản, bộ sưu tập & phân quyền RLS chặt chẽ" },
      { name: "Upstash Redis L2 Cache", desc: "Bộ đệm phân tán toàn cầu, phản hồi sub-millisecond" },
      { name: "Local-First Memory", desc: "Hoạt động ổn định, mượt mà kể cả khi mạng chập chờn" },
    ],
  },
  {
    title: "Xử Lý Video & Trí Tuệ Nhân Tạo",
    icon: Cpu,
    items: [
      { name: "HLS.js Video Engine", desc: "Phát trực tuyến bitrate thích ứng đa độ phân giải" },
      { name: "Multi-Model AI Engine", desc: "Phối hợp linh hoạt giữa Google Gemini, Groq & Mistral" },
      { name: "TMDB Data Normalization", desc: "Chuẩn hóa thông tin phim, diễn viên và poster sắc nét" },
    ],
  },
];

const FAQS = [
  {
    q: "Nanaflix có thu phí hay yêu cầu mua gói VIP không?",
    a: "Hoàn toàn không. Đây là dự án phi thương mại được xây dựng từ niềm đam mê điện ảnh và kỹ nghệ phần mềm. Bạn có thể xem miễn phí không giới hạn.",
  },
  {
    q: "Làm thế nào để đồng bộ lịch sử xem giữa điện thoại và máy tính?",
    a: "Chỉ cần đăng nhập cùng tài khoản trên cả hai thiết bị. Nanaflix sẽ tự động ghi nhớ tiến trình và hiển thị ngay mục 'Tiếp tục xem' ở trang chủ.",
  },
  {
    q: "Thông tin cá nhân của tôi có được bảo mật không?",
    a: "Nanaflix áp dụng chính sách bảo mật tối đa: Không lưu raw IP, không chia sẻ dữ liệu cho bên thứ ba, mọi kết nối được mã hóa chuẩn SSL/TLS.",
  },
  {
    q: "Nếu xem phim bị lag hoặc mất âm thanh thì làm thế nào?",
    a: "Tại trình phát phim, bạn có thể bấm nút đổi Server (HLS / Direct) hoặc chọn chất lượng phù hợp với đường truyền của mình.",
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
        
        {/* ================= HERO SECTION ================= */}
        <section className="text-center space-y-8 relative">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-xs font-semibold text-gray-300 shadow-2xl hover:border-white/20 transition">
            <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse" />
            <span>Nền Tảng Điện Ảnh Cá Nhân Hoá</span>
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
              Một không gian giải trí sạch bóng quảng cáo phiền toái, trình phát thích ứng mượt mà và nhớ chính xác từng giây bạn đã xem.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-white">0 Giây</div>
              <div className="text-[11px] text-gray-400 font-medium">Quảng cáo chờ</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-red-400">Adaptive</div>
              <div className="text-[11px] text-gray-400 font-medium">Auto Full HD / 4K</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-amber-400">Realtime</div>
              <div className="text-[11px] text-gray-400 font-medium">Đồng bộ đa thiết bị</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.08] backdrop-blur-md text-center space-y-0.5">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">100% Free</div>
              <div className="text-[11px] text-gray-400 font-medium">Phi thương mại</div>
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
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-gray-200 font-semibold text-sm transition-all backdrop-blur-md hover:border-white/20 active:scale-95"
            >
              <Compass size={16} />
              <span>Duyệt Theo Thể Loại</span>
            </Link>
          </div>
        </section>

        {/* ================= FOUNDER'S NOTE & CREATOR CARD ================= */}
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
                <p className="text-lg sm:text-xl text-white font-medium">
                  Chào bạn, mình là <span className="font-bold text-netflix-red">Dũng Trần</span>.
                </p>
                <p>
                  Nanaflix ra đời từ một nỗi bực mình rất đỗi quen thuộc: Mỗi lần muốn tìm một bộ phim hay để thư giãn sau ngày dài, thứ đập vào mắt lại là hàng tá quảng cáo cờ bạc nhấp nháy, link phim hỏng, và trình phát giật lag đến mức cụt cả hứng.
                </p>
                <p>
                  Mình quyết định tự tay xây dựng một trang web xem phim đúng nghĩa — nơi công nghệ phục vụ trọn vẹn cho cảm xúc điện ảnh. Không có bẫy click, không có quảng cáo rác; chỉ có phim hay, tốc độ tải tức thì và trải nghiệm cao cấp như đang ngồi trong rạp chiếu tại gia.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <span className="text-emerald-400 font-bold">●</span> Xây dựng với tất cả đam mê & sự chỉn chu.
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                    <Sparkles size={12} />
                    <span>Tác giả Nanaflix</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 4 CORE PILLARS (BENTO GRID) ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-netflix-red">
              <Zap size={14} />
              <span>Triết Lý Sản Phẩm</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              4 Chuẩn Mực Không Khoan Nhượng
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Mọi tính năng tại Nanaflix đều được tinh chỉnh xoay quanh sự thoải mái và tiện lợi của bạn.
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
                  {/* Subtle top glow */}
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
                    <span>Chuẩn mực #{p.number}</span>
                    <span className="text-gray-400">Nanaflix Core</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= TECH STACK & ENGINEERING DEEP DIVE ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-netflix-red">
              <Cpu size={14} />
              <span>Dưới Nắp Capo</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Công Nghệ & Kỹ Thuật Hệ Thống
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Kiến trúc hiện đại, phân tán và tối ưu hóa đến từng mili-giây.
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

        {/* ================= FAQS SECTION ================= */}
        <section className="space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-netflix-red">
              <HeartHandshake size={14} />
              <span>Giải Đáp Nhanh</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Những Câu Hỏi Thường Gặp
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-white/15 transition space-y-2 backdrop-blur-md"
              >
                <h4 className="text-sm font-bold text-white flex items-start gap-2">
                  <span className="text-netflix-red font-mono">Q.</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed pl-5">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= FINAL CINEMA CTA ================= */}
        <section className="pt-6 pb-2 text-center">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-white/[0.12] relative overflow-hidden space-y-6 shadow-2xl">
            <div className="space-y-3 max-w-xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-netflix-red uppercase">
                Bật đèn mờ & Tận hưởng
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Sẵn sàng cho bộ phim tiếp theo?
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Hàng ngàn bộ phim điện ảnh bom tấn, series truyền hình đình đám và các trận cầu trực tiếp đỉnh cao đang chờ đón bạn.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-sm transition-all shadow-xl shadow-red-950/50 hover:shadow-red-600/30 hover:scale-[1.02] active:scale-95"
              >
                <Play size={16} className="fill-current" />
                <span>Bắt Đầu Thưởng Thức</span>
              </Link>
              <Link
                href="/collection"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-gray-300 font-semibold text-sm transition-all backdrop-blur-md hover:border-white/20 active:scale-95"
              >
                <Film size={16} />
                <span>Xem Bộ Sưu Tập Đặc Sắc</span>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
