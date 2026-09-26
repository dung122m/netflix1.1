import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldAlert,
  Scale,
  Copyright,
  Mail,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Điều Khoản Dịch Vụ & Tuyên Bố DMCA | Nanaflix",
  description:
    "Quy định sử dụng nền tảng Nanaflix, tuyên bố miễn trừ trách nhiệm về nguồn nội dung phát trực tuyến và quy trình giải quyết quyền tác giả (DMCA Takedown).",
};

const TERMS_PILLARS = [
  {
    icon: Scale,
    title: "1. Nền Tảng Phi Thương Mại & Học Thuật",
    desc: "Nanaflix được xây dựng như một dự án nghiên cứu công nghệ giao diện điện ảnh, phát triển phục vụ cộng đồng hoàn toàn phi lợi nhuận. Chúng tôi không thu phí xem phim dưới mọi hình thức và cam kết duy trì không gian sạch 100% không quảng cáo rác.",
    badge: "100% Phi lợi nhuận",
    accent: "from-blue-500/20 to-cyan-500/5",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    icon: ShieldAlert,
    title: "2. Tuyên Bố Miễn Trừ Nguồn Nội Dung (Disclaimer)",
    desc: "Nanaflix KHÔNG lưu trữ (host), KHÔNG tải lên (upload) và KHÔNG sở hữu bất kỳ tệp video đa phương tiện nào trên máy chủ riêng. Tất cả luồng phát (HLS/m3u8, iframe) được tổng hợp, chỉ mục và nhúng trực tiếp từ các dịch vụ lưu trữ công khai của bên thứ ba trên Internet.",
    badge: "Không lưu trữ video",
    accent: "from-amber-500/20 to-orange-500/5",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
  {
    icon: Copyright,
    title: "3. Tôn Trọng Bản Quyền & Quy Trình DMCA",
    desc: "Chúng tôi luôn tôn trọng quyền sở hữu trí tuệ hợp pháp của các hãng phim, tác giả và nhà phát hành. Nếu bạn là chủ sở hữu bản quyền và muốn yêu cầu gỡ bỏ liên kết nhúng đối với nội dung thuộc quyền sở hữu của bạn, vui lòng gửi thông báo DMCA theo quy trình chuẩn.",
    badge: "Phản hồi trong 24–48h",
    accent: "from-rose-500/20 to-red-500/5",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-400",
  },
  {
    icon: ShieldCheck,
    title: "4. Chuẩn Mực Hành Xử Của Người Dùng",
    desc: "Người dùng có quyền tự do đóng góp ý kiến, đánh giá và thảo luận văn minh. Nghiêm cấm các hành vi spam, phát ngôn thù hận, vi phạm thuần phong mỹ tục, hoặc sử dụng công cụ tự động (bot/crawler) cố tình phá hoại hạ tầng kỹ thuật của website.",
    badge: "Cộng đồng văn minh",
    accent: "from-emerald-500/20 to-teal-500/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
  },
];

const DMCA_REQUIREMENTS = [
  {
    step: "01",
    title: "Xác định tác phẩm có bản quyền",
    desc: "Cung cấp tên chính xác của bộ phim, tập phim hoặc nội dung mà bạn cho rằng đang bị vi phạm quyền sở hữu trí tuệ.",
  },
  {
    step: "02",
    title: "Đường dẫn (URL) cụ thể trên Nanaflix",
    desc: "Cung cấp đường link chính xác dẫn đến trang phát phim trên Nanaflix (ví dụ: https://nanaflix.id.vn/movies/ten-phim).",
  },
  {
    step: "03",
    title: "Bằng chứng sở hữu hoặc quyền đại diện",
    desc: "Giấy tờ, văn bản chứng nhận quyền tác giả hoặc ủy quyền hợp pháp chứng minh bạn là chủ sở hữu hoặc đại diện hợp pháp của chủ sở hữu.",
  },
  {
    step: "04",
    title: "Thông tin liên hệ & Cam kết xác thực",
    desc: "Họ tên, đơn vị công tác, email và số điện thoại liên hệ, kèm lời cam kết các thông tin khai báo trong thông báo là hoàn toàn chính xác.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.12),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full space-y-16 sm:space-y-20">
        
        {/* ============================================================ */}
        {/* HEADER SECTION */}
        {/* ============================================================ */}
        <section className="space-y-4 text-center max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-1.5 rounded-full border border-white/[0.08] mb-2 backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang chủ</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide uppercase mx-auto block w-fit">
            <Scale className="w-3.5 h-3.5" />
            <span>Pháp lý & Quy chuẩn sử dụng</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Điều Khoản Dịch Vụ & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-netflix-red via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Chính Sách Bản Quyền DMCA
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
            Bản quy định chi tiết về quyền hạn, trách nhiệm và cam kết của Nanaflix đối với người dùng, 
            cùng tuyên bố miễn trừ bản quyền và cơ chế tiếp nhận khiếu nại sở hữu trí tuệ.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-zinc-500">
            <span>Phiên bản: <strong className="text-zinc-300">2.6</strong></span>
            <span>•</span>
            <span>Hiệu lực từ: <strong className="text-zinc-300">Tháng 09/2026</strong></span>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4 CỘT TRỤ ĐIỀU KHOẢN */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-netflix-red" />
              <span>4 Nguyên Tắc Cốt Lõi Tại Nanaflix</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Khung quy chuẩn xác định cách thức hoạt động và phạm vi trách nhiệm của hệ thống.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {TERMS_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className={`p-5 sm:p-6 rounded-2xl bg-gradient-to-b ${pillar.accent} bg-zinc-950/80 border ${pillar.borderColor} backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col justify-between group`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] ${pillar.iconColor} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                        {pillar.badge}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* NỘI DUNG CHI TIẾT ĐIỀU KHOẢN */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <span>Nội Dung Chi Tiết & Phạm Vi Miễn Trừ</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Hiểu rõ quyền lợi và nghĩa vụ khi tham gia trải nghiệm trên hệ thống.
            </p>
          </div>

          <div className="space-y-4">
            {/* ITEM 1 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-netflix-red font-mono font-black">1.1</span>
                <span>Chấp thuận điều khoản sử dụng</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Bằng việc truy cập, duyệt web hoặc sử dụng bất kỳ tính năng nào trên Nanaflix, bạn đồng ý tuân thủ toàn bộ các điều khoản được quy định tại văn bản này. Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản, vui lòng ngừng sử dụng trang web.
              </p>
            </div>

            {/* ITEM 2 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-amber-400 font-mono font-black">1.2</span>
                <span>Tính chất tổng hợp và không lưu trữ media</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Tất cả hình ảnh, poster, trailer và liên kết phát trực tiếp phim hiển thị trên Nanaflix đều được thu thập và nhúng từ các API mở, công cụ tìm kiếm và máy chủ của các bên thứ ba (như TMDB, các máy chủ CDN công khai). Nanaflix hoạt động tương tự như một công cụ lập chỉ mục (index search engine), hoàn toàn không tải lên hoặc lưu trữ nội dung đa phương tiện trên máy chủ riêng của mình.
              </p>
            </div>

            {/* ITEM 3 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-black">1.3</span>
                <span>Giới hạn trách nhiệm pháp lý</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Nanaflix không chịu trách nhiệm đối với bất kỳ tổn thất, gián đoạn kết nối, lỗi dữ liệu, hoặc chất lượng đường truyền bắt nguồn từ máy chủ phát video của bên thứ ba. Người dùng tự chịu trách nhiệm về tính phù hợp của nội dung đối với độ tuổi và quy định pháp luật tại khu vực sinh sống.
              </p>
            </div>

            {/* ITEM 4 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-blue-400 font-mono font-black">1.4</span>
                <span>Quyền điều chỉnh và cập nhật dịch vụ</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                Nanaflix có toàn quyền nâng cấp, thay đổi giao diện, bổ sung hoặc tạm ngưng một phần tính năng kỹ thuật nhằm mục đích bảo trì, tối ưu hóa hệ thống mà không cần thông báo trước. Các thay đổi về điều khoản sẽ được cập nhật trực tiếp tại trang này.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* QUY TRÌNH TIẾP NHẬN DMCA TAKEDOWN */}
        {/* ============================================================ */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bảo vệ quyền sở hữu trí tuệ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quy Trình Xử Lý Khiếu Nại Bản Quyền (DMCA Takedown)
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Nếu bạn phát hiện nội dung vi phạm quyền sở hữu của mình, hãy gửi yêu cầu gỡ bỏ theo 4 bước sau:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DMCA_REQUIREMENTS.map((req) => (
              <div
                key={req.step}
                className="p-5 rounded-2xl bg-zinc-950/70 border border-white/[0.08] flex items-start gap-4 hover:border-white/20 transition-colors"
              >
                <span className="text-xl font-black font-mono text-netflix-red px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
                  {req.step}
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">{req.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{req.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* DMCA CONTACT BOX */}
          <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-red-950/40 via-zinc-950/90 to-zinc-950 border border-red-500/30 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <Mail className="w-4 h-4" />
                <span>Hộp thư hỗ trợ bản quyền & pháp lý</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Gửi Thông Báo DMCA Tới Quản Trị Viên
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
                Chúng tôi sẽ xác thực và gỡ bỏ ngay lập tức đường dẫn nhúng nội dung bị ảnh hưởng trong vòng <strong>24 đến 48 giờ</strong> làm việc.
              </p>
            </div>

            <a
              href="mailto:contact@nanaflix.id.vn?subject=[DMCA%20Takedown%20Request]%20Yeu%20cau%20go%20bo%20noi%20dung"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-red-600/30 hover:scale-105 shrink-0"
            >
              <Mail className="w-4 h-4" />
              <span>Gửi thông báo DMCA</span>
            </a>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CROSS LINKS (PRIVACY, ABOUT, FAQ) */}
        {/* ============================================================ */}
        <section className="border-t border-white/[0.08] pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/privacy"
            className="p-4 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 border border-white/[0.06] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Chính sách bảo mật</div>
                <div className="text-[11px] text-gray-400">Không lưu IP, bảo vệ dữ liệu</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/about"
            className="p-4 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 border border-white/[0.06] hover:border-red-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-netflix-red" />
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">Giới thiệu Nanaflix</div>
                <div className="text-[11px] text-gray-400">Câu chuyện & Đội ngũ sáng lập</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/faq"
            className="p-4 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 border border-white/[0.06] hover:border-amber-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Hỏi đáp & Hướng dẫn</div>
                <div className="text-[11px] text-gray-400">Cài App, Cast TV & Phím tắt</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Link>
        </section>

      </main>

      <Footer />
    </div>
  );
}
