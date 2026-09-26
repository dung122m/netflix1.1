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
  CheckCircle2,
  Lock,
  Globe,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Điều Khoản Dịch Vụ & Chính Sách Bản Quyền DMCA | Nanaflix",
  description:
    "Quy chuẩn pháp lý, tuyên bố miễn trừ trách nhiệm về lưu trữ nội dung trực tuyến và quy trình tiếp nhận, xử lý khiếu nại bản quyền tác giả (DMCA Takedown) tại Nanaflix.",
};

const TERMS_PILLARS = [
  {
    icon: Scale,
    title: "1. Nền Tảng Phi Thương Mại & Nghiên Cứu Giao Diện",
    desc: "Nanaflix được xây dựng như một dự án nghiên cứu công nghệ giao diện web điện ảnh và phân tán luồng phát trực tuyến. Dự án phục vụ cộng đồng hoàn toàn phi lợi nhuận, không thu phí dịch vụ và cam kết duy trì không gian sạch 100% không quảng cáo rác.",
    badge: "100% Phi lợi nhuận",
    accent: "from-blue-500/20 to-cyan-500/5",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    icon: ShieldAlert,
    title: "2. Tuyên Bố Miễn Trừ Nguồn Phát (Safe Harbor / No-Hosting)",
    desc: "Nanaflix KHÔNG lưu trữ (host), KHÔNG tải lên (upload) và KHÔNG sở hữu bất kỳ tệp video đa phương tiện nào trên máy chủ riêng. Tất cả luồng phát (HLS/m3u8, iframe) được tổng hợp, lập chỉ mục và nhúng từ các máy chủ lưu trữ công khai của bên thứ ba trên Internet.",
    badge: "Không lưu trữ video",
    accent: "from-amber-500/20 to-orange-500/5",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
  {
    icon: Copyright,
    title: "3. Tôn Trọng Bản Quyền & Quy Trình DMCA Minh Bạch",
    desc: "Chúng tôi luôn tôn trọng quyền sở hữu trí tuệ hợp pháp của các hãng sản xuất, tác giả và nhà phân phối điện ảnh. Nếu bạn là chủ sở hữu bản quyền và muốn gỡ bỏ liên kết nhúng đối với nội dung thuộc quyền sở hữu của mình, chúng tôi sẽ xử lý ngay lập tức.",
    badge: "Phản hồi trong 24–48h",
    accent: "from-rose-500/20 to-red-500/5",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-400",
  },
  {
    icon: ShieldCheck,
    title: "4. Chuẩn Mực Hành Vi & An Toàn Không Gian Mạng",
    desc: "Người dùng có quyền tự do đóng góp ý kiến, đánh giá và thảo luận văn minh. Nghiêm cấm các hành vi phát ngôn thù hận, spam bot, cố tình khai thác lỗ hổng kỹ thuật hoặc sử dụng công cụ tự động (crawler/scraper) gây quá tải hạ tầng hệ thống.",
    badge: "Cộng đồng văn minh",
    accent: "from-emerald-500/20 to-teal-500/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
  },
];

const DETAILED_SECTIONS = [
  {
    number: "1.1",
    title: "Chấp thuận điều khoản dịch vụ",
    content:
      "Bằng việc truy cập, duyệt web hoặc sử dụng bất kỳ tính năng nào trên Nanaflix, bạn đồng ý tuân thủ toàn bộ các điều khoản được quy định tại văn bản này. Nếu bạn không đồng ý với bất kỳ nội dung nào trong bản điều khoản, vui lòng ngừng truy cập và sử dụng dịch vụ ngay lập tức.",
  },
  {
    number: "1.2",
    title: "Bản chất kỹ thuật của công cụ lập chỉ mục (Index Aggregator)",
    content:
      "Nanaflix hoạt động tương tự như một công cụ tìm kiếm và lập chỉ mục thông tin. Tất cả hình ảnh poster, thông tin diễn viên, trailer và liên kết phát trực tiếp được thu thập tự động từ các nguồn dữ liệu mở của bên thứ ba (như The Movie Database - TMDB và các máy chủ CDN công khai). Nanaflix không chịu trách nhiệm về nội dung, tính chính xác hoặc bản quyền của các tệp video được lưu trữ trên các máy chủ độc lập ngoài tầm kiểm soát của chúng tôi.",
  },
  {
    number: "1.3",
    title: "Quy định về hành vi bị nghiêm cấm",
    content:
      "Người dùng tuyệt đối không được: (a) Thực hiện các cuộc tấn công từ chối dịch vụ (DDoS), chèn mã độc hại hoặc can thiệp vào máy chủ và cơ sở dữ liệu; (b) Khai thác trái phép API hoặc sử dụng bot tự động gửi hàng loạt truy vấn gây nghẽn băng thông; (c) Sử dụng dịch vụ cho các mục đích vi phạm pháp luật hiện hành tại quốc gia sở tại.",
  },
  {
    number: "1.4",
    title: "Quyền sở hữu trí tuệ đối với giao diện và mã nguồn Nanaflix",
    content:
      "Mọi yếu tố về thiết kế giao diện (UI/UX), đồ họa, biểu tượng thương hiệu, hiệu ứng hình ảnh và mã nguồn phát triển bởi đội ngũ Nanaflix thuộc quyền sở hữu trí tuệ của tác giả. Nghiêm cấm sao chép, giả mạo giao diện nhằm mục đích thương mại hoặc lừa đảo người dùng.",
  },
  {
    number: "1.5",
    title: "Giới hạn trách nhiệm pháp lý (Limitation of Liability)",
    content:
      "Nanaflix cung cấp dịch vụ trên nguyên tắc 'nguyên trạng' (As-Is) và 'sẵn có' (As-Available). Chúng tôi không bảo đảm rằng dịch vụ sẽ không bao giờ bị gián đoạn, hoàn toàn không có lỗi kỹ thuật hoặc máy chủ phát của bên thứ ba luôn hoạt động ổn định. Trong mọi trường hợp, Nanaflix không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp hay gián tiếp nào phát sinh từ việc sử dụng dịch vụ.",
  },
  {
    number: "1.6",
    title: "Quyền điều chỉnh và cập nhật điều khoản",
    content:
      "Chúng tôi có toàn quyền sửa đổi, bổ sung hoặc cập nhật các điều khoản này vào bất kỳ lúc nào để phù hợp với sự phát triển của công nghệ và quy định pháp lý. Các thay đổi sẽ có hiệu lực ngay khi được công bố trên trang web này.",
  },
];

const DMCA_REQUIREMENTS = [
  {
    step: "01",
    title: "Xác định tác phẩm có bản quyền",
    desc: "Cung cấp tên chính xác của bộ phim, tập phim hoặc tác phẩm điện ảnh mà bạn cho rằng quyền sở hữu trí tuệ đang bị ảnh hưởng.",
  },
  {
    step: "02",
    title: "Đường dẫn (URL) cụ thể trên Nanaflix",
    desc: "Cung cấp đường link chính xác dẫn đến trang phát phim trên Nanaflix (ví dụ: https://nanaflix.id.vn/movies/ten-phim).",
  },
  {
    step: "03",
    title: "Bằng chứng sở hữu hoặc quyền đại diện",
    desc: "Văn bản, giấy chứng nhận quyền tác giả hoặc ủy quyền hợp pháp chứng minh bạn là chủ sở hữu hoặc đại diện được ủy quyền hợp pháp của chủ sở hữu.",
  },
  {
    step: "04",
    title: "Thông tin liên hệ & Cam kết pháp lý",
    desc: "Họ tên, đơn vị công tác, email và số điện thoại liên hệ chính thức, kèm lời cam kết các thông tin khai báo là hoàn toàn trung thực.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.12),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full space-y-16 sm:space-y-20">
        
        {/* ================= 1. HEADER SECTION ================= */}
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
            <span>Pháp Lý & Quy Chuẩn Hoạt Động</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Điều Khoản Dịch Vụ & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-netflix-red via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Chính Sách Bản Quyền DMCA
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed font-normal">
            Bản quy định chi tiết về quyền hạn, trách nhiệm và cam kết của Nanaflix đối với người dùng, 
            cùng tuyên bố miễn trừ bản quyền và cơ chế tiếp nhận khiếu nại sở hữu trí tuệ minh bạch.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-zinc-500 font-mono">
            <span>Phiên bản: <strong className="text-zinc-300">2.6</strong></span>
            <span>•</span>
            <span>Hiệu lực từ: <strong className="text-zinc-300">Tháng 09/2026</strong></span>
          </div>
        </section>

        {/* ================= 2. 4 CORE PILLARS ================= */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-netflix-red" />
              <span>4 Nguyên Tắc Cốt Lõi Tại Nanaflix</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Khung quy chuẩn xác định cách thức vận hành và phạm vi trách nhiệm của hệ thống.
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

        {/* ================= 3. DETAILED LEGAL ARTICLES ================= */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <span>Nội Dung Chi Tiết & Phạm Vi Miễn Trừ Pháp Lý</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Hiểu rõ quyền lợi và nghĩa vụ của bạn khi tham gia trải nghiệm trên hệ thống.
            </p>
          </div>

          <div className="space-y-4">
            {DETAILED_SECTIONS.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-white/15 transition space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-netflix-red uppercase tracking-wider">
                    {sec.number}
                  </span>
                  <span className="text-gray-600">•</span>
                  <h3 className="text-sm sm:text-base font-bold text-white">{sec.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 4. DMCA TAKEDOWN PROCEDURE ================= */}
        <section className="space-y-6">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Bảo vệ quyền sở hữu trí tuệ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Quy Trình Tiếp Nhận & Xử Lý Khiếu Nại Bản Quyền (DMCA Takedown)
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Nếu bạn phát hiện nội dung liên kết nhúng vi phạm quyền sở hữu của mình, hãy gửi yêu cầu theo 4 bước sau:
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

        {/* ================= 5. CROSS LINKS ================= */}
        <section className="border-t border-white/[0.08] pt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/privacy"
            className="p-4 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 border border-white/[0.06] hover:border-emerald-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Chính sách bảo mật</div>
                <div className="text-[11px] text-gray-400">Không lưu IP, mã hóa RLS</div>
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
            href="/about#contact"
            className="p-4 rounded-xl bg-zinc-950/50 hover:bg-zinc-900 border border-white/[0.06] hover:border-rose-500/40 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-rose-400" />
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">Trợ giúp & Báo lỗi</div>
                <div className="text-[11px] text-gray-400">Báo lỗi link phim, góp ý</div>
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
