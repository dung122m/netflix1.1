import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  KeyRound,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  FileText,
  HelpCircle,
  Server,
  Globe,
  UserCheck,
  Mail,
  Scale,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Chính Sách Bảo Mật & Quyền Riêng Tư | Nanaflix",
  description:
    "Cam kết bảo vệ quyền riêng tư tuyệt đối tại Nanaflix: 100% không thương mại hóa dữ liệu, không lưu trữ địa chỉ IP thực, bảo mật tài khoản chuẩn Firebase & Supabase RLS theo tiêu chuẩn quốc tế GDPR.",
};

const PRIVACY_PILLARS = [
  {
    icon: EyeOff,
    title: "100% Không Bán & Không Thương Mại Hóa Dữ Liệu",
    desc: "Nanaflix là dự án phi thương mại. Chúng tôi tuyệt đối không kinh doanh, cho thuê, trao đổi hay chia sẻ dữ liệu cá nhân cũng như lịch sử xem phim của bạn cho bất kỳ mạng lưới quảng cáo, đối tác tiếp thị hay bên thứ ba nào.",
    badge: "Minh bạch tuyệt đối",
    accent: "from-rose-500/20 to-red-500/5",
    borderColor: "border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-400",
  },
  {
    icon: Lock,
    title: "Không Lưu Trữ Địa Chỉ IP Thô (Raw IP Anonymization)",
    desc: "Để bảo vệ quyền riêng tư kỹ thuật số, Nanaflix không bao giờ lưu trữ địa chỉ IP thực của bạn trong cơ sở dữ liệu. Mọi dữ liệu phân tích truy cập chỉ lấy thông tin xấp xỉ cấp Tỉnh/Thành phố nhằm phục vụ tối ưu hóa đường truyền CDN và thống kê ẩn danh.",
    badge: "Ẩn danh 100%",
    accent: "from-emerald-500/20 to-teal-500/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-400",
  },
  {
    icon: KeyRound,
    title: "Xác Thực Chuẩn Quốc Tế với Firebase & Supabase RLS",
    desc: "Mật khẩu và thông tin đăng nhập của bạn được quản lý bảo mật qua Google Firebase Authentication. Toàn bộ dữ liệu người dùng trong Supabase PostgreSQL được bảo vệ bởi chính sách Row Level Security (RLS) nghiêm ngặt — chỉ chính bạn mới có khóa quyền truy cập.",
    badge: "Mã hóa SSL/TLS 1.3",
    accent: "from-blue-500/20 to-cyan-500/5",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-400",
  },
  {
    icon: Trash2,
    title: "Toàn Quyền Kiểm Soát & Xóa Dữ Liệu (Right to Erasure)",
    desc: "Tuân thủ tiêu chuẩn bảo vệ quyền riêng tư GDPR, bạn có toàn quyền xóa lịch sử xem dở, làm trống danh sách phim yêu thích, đăng xuất khỏi mọi thiết bị từ xa hoặc yêu cầu xóa vĩnh viễn tài khoản chỉ bằng 1 thao tác trong trang cá nhân.",
    badge: "Tự chủ người dùng",
    accent: "from-amber-500/20 to-yellow-500/5",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-400",
  },
];

const DATA_COLLECTION_DETAILS = [
  {
    category: "1. Thông tin hồ sơ tài khoản",
    what: "Tên hiển thị, Địa chỉ Email, Ảnh đại diện (nếu bạn đăng nhập bằng Google hoặc Email cá nhân).",
    why: "Tạo tài khoản thành viên, đồng bộ danh sách phim cá nhân và lưu cài đặt phụ đề/âm lượng qua đám mây.",
    storage: "Google Firebase Auth & Supabase PostgreSQL (mã hóa RLS)",
    retention: "Lưu trữ cho đến khi bạn bấm 'Xóa tài khoản vĩnh viễn'.",
  },
  {
    category: "2. Tiến trình & Lịch sử xem phim",
    what: "Tập phim và số giây mốc thời gian bạn đang xem dở (ví dụ: tập 3, 18 phút 42 giây).",
    why: "Cho phép bạn tiếp tục xem liền mạch trên điện thoại hoặc Smart TV mà không cần phải tua tìm lại.",
    storage: "Cơ sở dữ liệu Supabase & LocalStorage trên thiết bị của bạn",
    retention: "Tự động dọn dẹp các mốc cũ hơn 90 ngày hoặc xóa ngay khi người dùng chọn.",
  },
  {
    category: "3. Cấu hình trình phát video cục bộ",
    what: "Tốc độ phát (0.75x, 1x, 1.25x...), mức âm lượng, kích thước phông chữ và màu sắc phụ đề.",
    why: "Ghi nhớ sở thích tùy chỉnh của bạn để bạn không phải thiết lập lại ở mỗi lần xem phim.",
    storage: "LocalStorage trên trình duyệt web của bạn (hoàn toàn cục bộ)",
    retention: "Lưu trữ trên thiết bị cá nhân, xóa khi dọn dẹp dữ liệu duyệt web.",
  },
  {
    category: "4. Dữ liệu giám sát hiệu năng ẩn danh",
    what: "Loại thiết bị (Desktop/Mobile), phiên bản trình duyệt, mã lỗi phát video nếu có sự cố.",
    why: "Giúp tác giả phát hiện các máy chủ phát phim bị chậm hoặc hỏng link để kịp thời chuyển luồng dự phòng.",
    storage: "Bộ nhớ đệm Upstash Redis phân tán (không gắn với thông tin định danh cá nhân)",
    retention: "Tự động xóa sau 7 ngày.",
  },
];

const PRIVACY_ARTICLES = [
  {
    number: "Điều 1",
    title: "Nguyên Tắc Thu Thập Tối Thiểu (Data Minimization)",
    content:
      "Nanaflix tuân thủ nguyên tắc chỉ thu thập những trường dữ liệu thực sự cần thiết để vận hành các tính năng phục vụ người dùng. Chúng tôi không yêu cầu số điện thoại, thông tin thẻ tín dụng, địa chỉ nhà ở hay bất kỳ thông tin nhạy cảm nào khác.",
  },
  {
    number: "Điều 2",
    title: "Chính Sách Cookie & Lưu Trữ Cục Bộ (Cookies & Storage)",
    content:
      "Nanaflix tuyệt đối KHÔNG sử dụng cookie theo dõi của bên thứ ba (Third-Party Tracking Cookies) nhằm mục đích quảng cáo. Trình duyệt của bạn chỉ lưu trữ các cookie kỹ thuật cần thiết để duy trì phiên đăng nhập an toàn (Authentication Session) và LocalStorage để lưu cài đặt âm lượng, phụ đề.",
  },
  {
    number: "Điều 3",
    title: "Tích Hợp Dịch Vụ Bên Thứ Ba & API",
    content:
      "Nanaflix sử dụng API từ The Movie Database (TMDB) để lấy thông tin poster và mô tả phim chuẩn quốc tế; Google Firebase cho hệ thống xác thực người dùng; và Supabase cho cơ sở dữ liệu PostgreSQL. Mọi giao tiếp với các dịch vụ này đều được thực hiện qua giao thức mã hóa HTTPS/TLS bảo mật cao nhất.",
  },
  {
    number: "Điều 4",
    title: "Bảo Vệ Quyền Riêng Tư Của Trẻ Vị Thành Niên",
    content:
      "Nanaflix không chủ đích thu thập dữ liệu cá nhân từ trẻ em dưới 13 tuổi mà không có sự đồng ý của phụ huynh hoặc người giám hộ. Nếu phát hiện dữ liệu của trẻ em được gửi lên mà không được phép, chúng tôi sẽ tiến hành xóa bỏ ngay lập tức khỏi hệ thống.",
  },
  {
    number: "Điều 5",
    title: "Quyền Yêu Cầu Xuất & Xóa Dữ Liệu (GDPR / PDPA)",
    content:
      "Bạn có quyền gửi yêu cầu trích xuất toàn bộ dữ liệu cá nhân liên quan đến tài khoản của mình hoặc yêu cầu hủy bỏ vĩnh viễn mọi bản ghi trong hệ thống bằng cách liên hệ qua email quản trị contact@nanaflix.id.vn.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.1),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full space-y-16 sm:space-y-20">
        
        {/* ================= 1. HEADER SECTION ================= */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 backdrop-blur-xl shadow-sm">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Cam Kết Minh Bạch & An Toàn Tuyệt Đối</span>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Bảo Mật & <span className="text-emerald-400">Quyền Riêng Tư</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-400 font-normal leading-relaxed max-w-2xl mx-auto">
              Tại Nanaflix, sự riêng tư và an toàn dữ liệu của bạn được đặt lên hàng đầu. Dưới đây là văn bản cam kết rõ ràng, chi tiết và minh bạch về cách chúng tôi bảo vệ thông tin của bạn.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 font-mono">
            <span>Phiên bản hiệu lực: <strong className="text-gray-300 font-semibold">2.6</strong></span>
            <span>•</span>
            <span>Cập nhật lần cuối: <strong className="text-gray-300 font-semibold">Tháng 09/2026</strong></span>
          </div>
        </section>

        {/* ================= 2. 4 CORE PILLARS ================= */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PRIVACY_PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className={`p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-950/90 to-black border ${p.borderColor} transition-all duration-300 hover:shadow-2xl space-y-4 relative overflow-hidden group`}
              >
                <div
                  className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${p.accent} blur-3xl pointer-events-none -z-10`}
                />

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

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {p.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </section>

        {/* ================= 3. DETAILED DATA RETENTION & BREAKDOWN ================= */}
        <section className="p-6 sm:p-10 rounded-3xl bg-zinc-950/70 border border-white/[0.1] backdrop-blur-xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Chúng Tôi Thu Thập Dữ Liệu Nào & Sử Dụng Ra Sao?</h2>
              <p className="text-xs text-gray-400 mt-0.5">Mọi dữ liệu đều được phân loại mục đích rõ ràng và quản lý vòng đời nghiêm ngặt.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {DATA_COLLECTION_DETAILS.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-black/40 border border-white/[0.06] hover:border-white/15 transition space-y-3"
              >
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span>{item.category}</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 font-semibold">Dữ liệu: </span>
                    <span className="text-gray-300">{item.what}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Mục đích: </span>
                    <span className="text-gray-300">{item.why}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Nơi lưu trữ: </span>
                    <span className="text-emerald-400 font-mono text-[11px]">{item.storage}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold">Thời gian lưu: </span>
                    <span className="text-gray-400">{item.retention}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 4. LEGAL & TECHNICAL ARTICLES ================= */}
        <section className="space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" />
              <span>Các Điều Khoản Bảo Mật Chi Tiết</span>
            </h2>
            <p className="text-xs text-gray-400">Quy định cụ thể về trách nhiệm và quyền lợi của người dùng trên hệ thống.</p>
          </div>

          <div className="space-y-4">
            {PRIVACY_ARTICLES.map((art, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-zinc-950/60 border border-white/[0.08] hover:border-white/15 transition space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    {art.number}
                  </span>
                  <span className="text-gray-600">•</span>
                  <h3 className="text-sm sm:text-base font-bold text-white">{art.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed pl-0 sm:pl-2">
                  {art.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= 5. CROSS ACTIONS ================= */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900/80 to-black border border-white/10">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-white">Bạn có thắc mắc hoặc cần hỗ trợ về bảo mật tài khoản?</h4>
            <p className="text-xs text-gray-400">Xem thêm các điều khoản dịch vụ hoặc liên hệ bộ phận hỗ trợ kỹ thuật.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/terms"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-xs font-semibold text-gray-200 transition"
            >
              <Scale size={14} />
              <span>Điều Khoản Dịch Vụ</span>
            </Link>
            <Link
              href="/about#contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition shadow-lg"
            >
              <Mail size={14} />
              <span>Liên Hệ Quản Trị</span>
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
